import  request  from "supertest";
import { prisma } from "@/database/prisma";
import { app } from "@/app";
import { after } from 'node:test';

describe("UsersController", () => {
    let user_id: string;
    let token: string;

    afterAll(async () => {
        await prisma.user.delete({ where: { id: user_id } });
    });

    it("should throw a validation error if email is invalid", async () => {
    const response = await request(app).post("/users").send({
        name: "Invalid Email User",
        email: "invalid-email",
        password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("validation error");
    })

    it("should create a new user successfully", async () => {  
        const response = await request(app).post("/users").send({
            name: "Test User",
            email: "testuser@example.com",
            password: "password123",
        })

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("id");
        expect(response.body.name).toBe("Test User");

        user_id = response.body.id
    });

    it("should not create a user with an existing email", async () => {
    const response = await request(app).post("/users").send({
        name: "Test User",
        email: "testuser@example.com",
        password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email already in use");
    })

    it("should fail to access protected route without token", async () => {
    const response = await request(app).get(`/users/${user_id}`);
    expect(response.status).toBe(400);
    });

    it("should fail to authenticate with invalid credentials", async () => {
    const sessionResponse = await request(app).post("/sessions").send({
        email: "testwronguser@example.com",
        password: "password123",
    });
    token = sessionResponse.body.token;
    expect(sessionResponse.status).toBe(401);
    expect(sessionResponse.body.message).toBe("E-mail ou senha inválido.");
    });

    it("should authenticate and get an access token", async () => {
        const sessionResponse = await request(app).post("/sessions").send({
            email: "testuser@example.com",
            password: "password123",
        });
        token = sessionResponse.body.token;

        expect(sessionResponse.status).toBe(200);
        expect(sessionResponse.body.token).toEqual(expect.any(String));
    });

    it("should fail to access protected route without authorizated token", async () => {
    const response = await request(app)
    .get(`/users/${user_id}`)
    .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(401);
    });

})