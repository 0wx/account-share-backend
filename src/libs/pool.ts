import { Socket } from 'socket.io'
import { prisma } from '../db/prisma'
import { sendMessage } from './slack'
import ms from 'ms'

export interface Data {
  accountId: number
  contains?: string
  domain: string
  endsWith?: string
  id: number
  startsWith?: string
  type: string
  account: Account
  user: User
}

export interface Account {
  email: string
  id: number
  name: string
  rules: Rule[]
}

export interface Rule {
  accountId: number
  contains?: string
  domain: string
  endsWith?: string
  id: number
  startsWith?: string
  type: string
}

export interface User {
  email: string
  name: string
}

export interface Employee {
  data: Data
  socket: Socket
  startTime: number
}

export class Pool {
  activeSockets: Employee[]
  idleSockets: Array<Employee & { idleTime: number }>
  constructor() {
    this.activeSockets = []
    this.idleSockets = []
  }

  getSockets() {
    return [...this.activeSockets, ...this.idleSockets]
  }

  addSocket(data: Data, socket: Socket) {
    this.sharedAccount(data)
    const idle = this.idleSockets.find(
      (s) => s.data.accountId === data.accountId
    )

    if (idle) {
      if (Date.now() - idle.idleTime < 1000 * 10) {
        idle.socket = socket
        this.activeSockets.push(idle)
        this.idleSockets = this.idleSockets.filter(
          (s) =>
            s.data.account.id !== idle.data.account.id &&
            s.data.account.email !== idle.data.account.email
        )
        return
      }
    }

    const startTime = Date.now()

    this.activeSockets.push({ data, socket, startTime })
    this.sessionStarted({ data, socket, startTime })

  }

  async sharedAccount(data: Data) {
    try {
      const shared = await prisma.sharedAccount.findFirst({
        where: {
          email: data.account.email,
          accountId: data.account.id,
        },
      })

      if(!shared) {
        await prisma.sharedAccount.create({
          data: {
            email: data.account.email,
            accountId: data.account.id,
          },
        })
      }

    } catch (error) {
      console.log(error)
    }

  }

  disconnectSocket(socket: Socket) {
    const activeSocket = this.activeSockets.find((s) => s.socket === socket)
    if (activeSocket) {
      this.idleSockets.push({ ...activeSocket, idleTime: Date.now() })
      this.activeSockets = this.activeSockets.filter((s) => s.socket.id !== socket.id)
    }
  }

  sessionStarted(data: Employee) {
    const message = `🚧 ${data.data.user.name} has Started a session using:\n${data.data.account.name} (${data.data.account.email})`
    sendMessage(message)
  }
  
  sessionEnded(data: Employee) {
    
    const fullTime = ms(Date.now() - data.startTime, { long: true })
    const message = `✅ ${data.data.user.name} has Stop a session using:\n${data.data.account.name} (${data.data.account.email}) ~ ${fullTime}`
    sendMessage(message)
  }

  polling() {
    setInterval(() => {
      this.idleSockets.forEach((s) => {
        if (Date.now() - s.idleTime > 1000 * 10) {
          this.idleSockets = this.idleSockets.filter(
            (s) =>
              s.data.account.id !== s.data.account.id &&
              s.data.account.email !== s.data.account.email
          )

          this.sessionEnded(s)
        }
      })
    }, 1000 * 10)
  }
}
