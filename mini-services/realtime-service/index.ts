import { createServer } from "http";
import { Server } from "socket.io";

// ─── Types ────────────────────────────────────────────────────────
interface IncomingAgentMessage {
  conversationId: string;
  message: {
    id: string;
    role: "AGENT" | "AI" | "VISITOR";
    content: string;
    createdAt: string;
  };
  orgId?: string;
}

interface IncomingVisitorMessage {
  conversationId: string;
  message: {
    id: string;
    role: "VISITOR" | "AI" | "AGENT";
    content: string;
    createdAt: string;
  };
  orgId?: string;
}

interface ConversationUpdatePayload {
  conversationId: string;
  orgId?: string;
  patch: Record<string, unknown>;
}

// ─── HTTP + Socket.io setup ───────────────────────────────────────
const httpServer = createServer((req, res) => {
  // Simple health-check endpoint for verification
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        service: "replyai-realtime",
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(httpServer, {
  // IMPORTANT: path must remain "/" — Caddy uses it to route to this port.
  path: "/",
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Connection handling ──────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[realtime] socket connected: ${socket.id}`);

  // Agent inbox subscribes to a specific conversation room.
  socket.on("join:conversation", (conversationId: string) => {
    if (!conversationId) return;
    const room = `conv:${conversationId}`;
    void socket.join(room);
    console.log(`[realtime] ${socket.id} joined room ${room}`);
  });

  socket.on("leave:conversation", (conversationId: string) => {
    if (!conversationId) return;
    const room = `conv:${conversationId}`;
    void socket.leave(room);
    console.log(`[realtime] ${socket.id} left room ${room}`);
  });

  // Org-level room (for inbox-wide updates — e.g. new visitor conversation).
  socket.on("join:org", (orgId: string) => {
    if (!orgId) return;
    const room = `org:${orgId}`;
    void socket.join(room);
    console.log(`[realtime] ${socket.id} joined org room ${room}`);
  });

  socket.on("leave:org", (orgId: string) => {
    if (!orgId) return;
    void socket.leave(`org:${orgId}`);
  });

  // Agent posts a message from the inbox → broadcast to the conversation room
  // so the visitor widget (if connected) receives it live.
  socket.on("agent:message", (payload: IncomingAgentMessage) => {
    if (!payload?.conversationId) return;
    const room = `conv:${payload.conversationId}`;
    io.to(room).emit("message:new", {
      conversationId: payload.conversationId,
      message: payload.message,
    });
    // Also nudge org-room listeners that the conversation updated.
    const orgRoom = payload.orgId ? `org:${payload.orgId}` : null;
    if (orgRoom) {
      io.to(orgRoom).emit("conversation:update", {
        conversationId: payload.conversationId,
        patch: { updatedAt: payload.message.createdAt },
      });
    }
    console.log(
      `[realtime] agent:message → ${room} (${payload.message.content?.length ?? 0} chars)`
    );
  });

  // Visitor posts a message from the widget → broadcast to the conversation room
  // so the agent inbox receives it live.
  socket.on("visitor:message", (payload: IncomingVisitorMessage) => {
    if (!payload?.conversationId) return;
    const room = `conv:${payload.conversationId}`;
    io.to(room).emit("message:new", {
      conversationId: payload.conversationId,
      message: payload.message,
    });
    const orgRoom = payload.orgId ? `org:${payload.orgId}` : null;
    if (orgRoom) {
      io.to(orgRoom).emit("conversation:update", {
        conversationId: payload.conversationId,
        patch: { updatedAt: payload.message.createdAt },
      });
    }
    console.log(
      `[realtime] visitor:message → ${room} (${payload.message.content?.length ?? 0} chars)`
    );
  });

  // Generic conversation update broadcast (status change, assignment, etc.)
  socket.on("conversation:update", (payload: ConversationUpdatePayload) => {
    if (!payload?.conversationId) return;
    const room = `conv:${payload.conversationId}`;
    io.to(room).emit("conversation:update", {
      conversationId: payload.conversationId,
      patch: payload.patch,
    });
    const orgRoom = payload.orgId ? `org:${payload.orgId}` : null;
    if (orgRoom) {
      io.to(orgRoom).emit("conversation:update", {
        conversationId: payload.conversationId,
        patch: payload.patch,
      });
    }
  });

  // Typing indicator relay (agent → visitor widget, visitor → inbox)
  socket.on("typing", (payload: { conversationId: string; who: "agent" | "visitor" }) => {
    if (!payload?.conversationId) return;
    io.to(`conv:${payload.conversationId}`).emit("typing", payload);
  });

  socket.on("stop:typing", (payload: { conversationId: string; who: "agent" | "visitor" }) => {
    if (!payload?.conversationId) return;
    io.to(`conv:${payload.conversationId}`).emit("stop:typing", payload);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[realtime] socket disconnected: ${socket.id} (${reason})`);
  });

  socket.on("error", (err) => {
    console.error(`[realtime] socket error (${socket.id}):`, err);
  });
});

// ─── Boot ─────────────────────────────────────────────────────────
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`[realtime] ReplyAI realtime service listening on port ${PORT}`);
  console.log(`[realtime] CORS origin: http://localhost:3000`);
  console.log(`[realtime] socket.io path: /`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[realtime] ${signal} received, shutting down...`);
  io.close(() => {
    httpServer.close(() => {
      console.log("[realtime] server closed");
      process.exit(0);
    });
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
