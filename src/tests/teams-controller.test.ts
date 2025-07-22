import  request  from "supertest";
import { prisma } from "@/database/prisma";
import { app } from "@/app";

describe("TeamsController", () => {
    let user_id: string;
    let token: string;

    afterAll(async () => {
    await prisma.teamMember.deleteMany({
        where: {
        user: {
            email: {
            in: ["testuser@example.com", "toadd@example.com"],
            },
        },
        },
    });

    await prisma.team.deleteMany({
        where: {
        name: {
            in: ["Dev Team", "Team Ops"],
        },
        },
    });

    await prisma.user.deleteMany({
        where: {
        email: {
            in: ["testuser@example.com", "toadd@example.com"],
        },
        },
    });
    });

    it("should create a new admin user successfully", async () => {  
        const response = await request(app).post("/users").send({
            name: "Test User",
            email: "testuser@example.com",
            password: "password123",
            role: "admin"
        })

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("id");
        expect(response.body.name).toBe("Test User");

        user_id = response.body.id
    });

    it("should authenticate and get an admin access token", async () => {
        const sessionResponse = await request(app).post("/sessions").send({
            email: "testuser@example.com",
            password: "password123",
        });
        token = sessionResponse.body.token;

        expect(sessionResponse.status).toBe(200);
        expect(sessionResponse.body.token).toEqual(expect.any(String));
    });

    it("should allow an admin to create a team", async () => {
    const teamResponse = await request(app)
        .post("/teams")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Dev Team", description: "Frontend squad" });

    expect(teamResponse.status).toBe(201);
    expect(teamResponse.body.name).toBe("Dev Team");
    });

    it("should allow admin to add and remove members", async () => {
    // Criar user comum
    const user = await request(app).post("/users").send({
        name: "User To Add",
        email: "toadd@example.com",
        password: "password123",
    });

    // Criar time
    const teamResponse = await request(app)
    .post("/teams")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Team Ops" });

    const team = teamResponse.body;

    // Adicionar
    const addResponse = await request(app)
        .post(`/teams/${team.id}/members`)
        .set("Authorization", `Bearer ${token}`)
        .send({ userId: user.body.id });

    expect(addResponse.status).toBe(201);

    // Remover
    const removeResponse = await request(app)
        .delete(`/teams/${team.id}/members/${user.body.id}`)
        .set("Authorization", `Bearer ${token}`);

    expect(removeResponse.status).toBe(204);
    });
})