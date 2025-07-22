import { Request, Response } from "express"
import { z } from "zod"
import { prisma } from "@/database/prisma"

export class TasksController {
  // Admin: criar nova tarefa
  async create(request: Request, response: Response) {
    const createTaskBodySchema = z.object({
      title: z.string().min(3),
      description: z.string().optional(),
      status: z.enum(["pending", "in_progress", "completed"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      assignedTo: z.string().uuid(),
      teamId: z.string().uuid()
    })

    const {
      title,
      description,
      status = "pending",
      priority = "medium",
      assignedTo,
      teamId
    } = createTaskBodySchema.parse(request.body)

    // Verifica se o time existe
    const teamExists = await prisma.team.findUnique({
      where: { id: teamId }
    })

    if (!teamExists) {
      return response.status(404).json({ error: "Team not found." })
    }

    // Verifica se o usuário existe
    const userExists = await prisma.user.findUnique({
      where: { id: assignedTo }
    })

    if (!userExists) {
      return response.status(404).json({ error: "Assigned user not found." })
    }

    // Verifica se o usuário está no time
    const isMember = await prisma.teamMember.findFirst({
      where: {
        userId: assignedTo,
        teamId: teamId
      }
    })

    if (!isMember) {
      return response.status(400).json({ error: "User is not a member of this team." })
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        assignedTo,
        teamId
      }
    })

    return response.status(201).json(task)
  }

  // Admin: listar todas as tarefas
  async listAll(request: Request, response: Response) {
  const tasks = await prisma.task.findMany()
  return response.json(tasks)
}

  // Admin e member: listar tarefas do time (member só vê se faz parte)
  async listByTeam(request: Request, response: Response) {
    const querySchema = z.object({
      teamId: z.string().uuid()
    })

    const { teamId } = querySchema.parse(request.query)
      const loggedUserId = request.user!.id
      const loggedUserRole = request.user!.role

      if (loggedUserRole === "member") {
        const isMember = await prisma.teamMember.findFirst({
          where: {
            teamId,
            userId: loggedUserId
          }
        })

        if (!isMember) {
          return response.status(403).json({ error: "Você não pertence a este time." })
        }
      }

      const tasks = await prisma.task.findMany({
        where: {
          teamId
        }
      })

      return response.json(tasks)
  }

  async listByLoggedUser(request: Request, response: Response) {
    const loggedUserId = request.user!.id

    const tasks = await prisma.task.findMany({
      where: {
        assignedTo: loggedUserId
      }
    })

    if (tasks.length === 0) {
      return response.status(404).json({ message: "Nenhuma tarefa atribuída a você." })
    }

    return response.json(tasks)
  }

  async listByUser(request: Request, response: Response) {
    const schema = z.object({
      userId: z.string().uuid()
    })

    const { userId } = schema.parse(request.query)
    const loggedUserId = request.user!.id
    const loggedUserRole = request.user!.role

    if (loggedUserRole === "member" && userId !== loggedUserId) {
      return response.status(403).json({ error: "Você só pode consultar suas próprias tarefas." })
    }

    const tasks = await prisma.task.findMany({
      where: {
        assignedTo: userId
      }
    })

    if (tasks.length === 0) {
      return response.status(404).json({ message: "Nenhuma tarefa atribuída a este usuário." })
    }

    return response.json(tasks)
  }

  async update(request: Request, response: Response) {
    const updateSchema = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["pending", "in_progress", "completed"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      assignedTo: z.string().uuid().optional()
    })

    const paramsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = paramsSchema.parse(request.params)
    const data = updateSchema.parse(request.body)

    const loggedUserId = request.user!.id
    const loggedUserRole = request.user!.role

    const task = await prisma.task.findUnique({ where: { id } })

    if (!task) {
      return response.status(404).json({ error: "Tarefa não encontrada." })
    }

    // Verificação: se for membro, só pode editar se for o responsável
    if (
      loggedUserRole === "member" &&
      task.assignedTo !== loggedUserId
    ) {
      return response.status(403).json({ error: "Você não pode editar esta tarefa." })
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data
    })

    // Verifica se o status foi alterado para registrar no histórico
    if (data.status && data.status !== task.status) {
      await prisma.taskHistory.create({
        data: {
          taskId: id,
          changedBy: loggedUserId,
          oldStatus: task.status,
          newStatus: data.status
        }
      })
    }

    return response.json(updatedTask)
  }

  async delete(request: Request, response: Response) {
    const schema = z.object({
      id: z.string().uuid()
    })

    const { id } = schema.parse(request.params)

    const task = await prisma.task.findUnique({ where: { id } })

    if (!task) {
      return response.status(404).json({ error: "Tarefa não encontrada." })
    }

    await prisma.task.delete({ where: { id } })

    return response.status(204).send()
  }

  // Admin e member: visualizar tarefa específica
  async showById(request: Request, response: Response) {
    const showParamsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = showParamsSchema.parse(request.params)

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        taskHistory: {
          orderBy: { changedAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!task) {
      return response.status(404).json({ error: "Tarefa não encontrada." })
    }

    const loggedUserId = request.user!.id
    const loggedUserRole = request.user!.role

    if (
      loggedUserRole === "member" &&
      !(await prisma.teamMember.findFirst({
        where: {
          userId: loggedUserId,
          teamId: task.teamId
        }
      }))
    ) {
      return response.status(403).json({ error: "Você não pode acessar essa tarefa." })
    }

    return response.json(task)
  }
}