import {Request, Response} from "express"
import {prisma} from "@/database/prisma"
import { AppError } from "@/utils/AppError"
import {z} from "zod"

class TeamsController{
    async create (request:Request, response:Response) {
        const bodySchema = z.object({
            name: z.string().trim().min(1, {message: "Informe o nome do time."}),
            description: z.string().optional(),
        })

        const {name, description} = bodySchema.parse(request.body)

        if(!request.user?.id){
            throw new AppError("Unauthorized", 401)
        }

        const team = await prisma.team.create({
            data: {
                name,
                description,
            }
        })
        response.status(201).json(team)
    }

    async index(request: Request, response: Response) {
        const teams = await prisma.team.findMany({
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        response.json(teams)
    }

    async update(request: Request, response: Response) {
        const paramsSchema = z.object({
            teamId: z.string().uuid("ID do time inválido."),
        })

        const bodySchema = z.object({
            name: z.string().trim().min(1, "Nome é obrigatório.").optional(),
            description: z.string().optional(),
        })

        const { teamId } = paramsSchema.parse(request.params)
        const { name, description } = bodySchema.parse(request.body)

        const team = await prisma.team.findUnique({ where: { id: teamId } })

        if (!team) {
            throw new AppError("Time não encontrado.", 404)
        }

        const updatedTeam = await prisma.team.update({
            where: { id: teamId },
            data: {
            name,
            description,
            },
        })

        return response.json(updatedTeam)
    }

    async delete(request: Request, response: Response) {
        const paramsSchema = z.object({
            teamId: z.string().uuid("ID do time inválido."),
        })

        const { teamId } = paramsSchema.parse(request.params)

        const team = await prisma.team.findUnique({ where: { id: teamId } })

        if (!team) {
            throw new AppError("Time não encontrado.", 404)
        }

        await prisma.team.delete({
            where: { id: teamId },
        })

        return response.status(204).send()
    }
    
    async listByLoggedUser(request: Request, response: Response) {
        const userId = request.user?.id

        if (!userId) {
            throw new AppError("Não autorizado.", 401)
        }

        const teams = await prisma.team.findMany({
            where: {
                members: {
                    some: {
                        userId,
                    },
                },
            },
        })

        return response.json(teams)
    }

    async addMember(request: Request, response: Response) {
        const paramsSchema = z.object({
            teamId: z.string().uuid("ID do time inválido."),
        })

        const bodySchema = z.object({
            userId: z.string().uuid("ID do usuário inválido."),
        })

        const { teamId } = paramsSchema.parse(request.params)
        const { userId } = bodySchema.parse(request.body)

        const team = await prisma.team.findUnique({ where: { id: teamId } })
        if (!team) {
            throw new AppError("Time não encontrado.", 404)
        }

        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            throw new AppError("Usuário não encontrado.", 404)
        }

        const existingMembership = await prisma.teamMember.findFirst({
            where: {
                userId,
                teamId,
            },
        })

        if (existingMembership) {
            throw new AppError("Usuário já é membro deste time.", 400)
        }

        const membership = await prisma.teamMember.create({
            data: {
                userId,
                teamId,
            },
        })

        return response.status(201).json(membership)
    }

    async removeMember(request: Request, response: Response) {
        const paramsSchema = z.object({
            teamId: z.string().uuid("ID do time inválido."),
            userId: z.string().uuid("ID do usuário inválido."),
        })

        const { teamId, userId } = paramsSchema.parse(request.params)

        const result = await prisma.teamMember.deleteMany({
            where: {
            teamId,
            userId,
            },
        })

        if (result.count === 0) {
            throw new AppError("Membro não encontrado nesse time", 404)
        }

        return response.status(204).send()
    }
}

export {TeamsController}