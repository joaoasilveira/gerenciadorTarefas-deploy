import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import {prisma} from "@/database/prisma"
import {z} from "zod"
import {hash} from "bcrypt"
import { AppError } from '@/utils/AppError';

class UsersController {
    // Criar usuário
    async create(request: Request, response: Response) {
        const bodySchema = z.object({
            name: z.string().trim().min(2, {message: "Nome é obrigatório"}),
            email: z.string().trim().email({message: "E-mail inválido"}).toLowerCase(),
            password: z.string().min(6, {message: "A senha deve ter pelo menos 6 dígitos"}),
            role: z.enum([UserRole.member, UserRole.admin]).default(UserRole.member)
        })

        const {name, email, password, role} = bodySchema.parse(request.body)
        
        const userWithSameEmail = await prisma.user.findFirst({where: {email}})
        if (userWithSameEmail) {
            throw new AppError("Email already in use", 400)
        }

        const hashedPassword = await hash(password, 8)

        const user =await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
            }
        })

        const {password: _, ...userWithoutPassword} = user

        response.status(201).json(userWithoutPassword)
    }

    // Listar todos usuários
    async index(request: Request, response: Response) {
        const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        });

        response.json(users);
    }

    // Buscar usuário por ID
    async show(request: Request, response: Response) {
        const paramsSchema = z.object({
        id: z.string().uuid("ID inválido"),
        });

        const { id } = paramsSchema.parse(request.params);

        const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
        });

        if (!user) {
        throw new AppError("Usuário não encontrado", 404);
        }

        response.json(user);
    }

    // Atualizar usuário (name, email, role)
    async update(request: Request, response: Response) {
        const paramsSchema = z.object({
        id: z.string().uuid("ID inválido"),
        });

        const bodySchema = z.object({
        name: z.string().trim().min(2).optional(),
        email: z.string().trim().email().optional(),
        role: z.enum([UserRole.member, UserRole.admin]).optional(),
        });

        const { id } = paramsSchema.parse(request.params);
        const data = bodySchema.parse(request.body);

        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
        throw new AppError("Usuário não encontrado", 404);
        }

        // Se email for alterado, verificar duplicidade
        if (data.email && data.email !== user.email) {
        const userWithSameEmail = await prisma.user.findFirst({
            where: { email: data.email },
        });
        if (userWithSameEmail) {
            throw new AppError("Email já em uso", 400);
        }
        }

        const updatedUser = await prisma.user.update({
        where: { id },
        data,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
        });

        response.json(updatedUser);
    }

    // Deletar usuário
    async delete(request: Request, response: Response) {
        const paramsSchema = z.object({
        id: z.string().uuid("ID inválido"),
        });

        const { id } = paramsSchema.parse(request.params);

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
        throw new AppError("Usuário não encontrado", 404);
        }

        await prisma.user.delete({ where: { id } });

        response.status(204).send();
    }
}

export { UsersController }