require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// =========================
// Middlewares
// =========================

app.use(cors());
app.use(express.json());

// =========================
// Socket.IO
// =========================

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5174",
      "http://192.168.1.83:5174"
    ],
    methods: ["GET", "POST", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// =========================
// Conexión a MySQL
// =========================

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// =========================
// Esperar conexión a MySQL
// =========================

const waitForDb = () => {
  return new Promise((resolve) => {
    const check = () => {
      db.query("SELECT 1", (err) => {
        if (err) {
          console.log("Esperando a que MySQL esté listo...");
          setTimeout(check, 2000);
        } else {
          resolve();
        }
      });
    };

    check();
  });
};

// =========================
// GET - Obtener productos
// =========================

app.get("/productos", (req, res) => {
  const query =
    "SELECT * FROM productos WHERE activo = TRUE ORDER BY id";

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        error: "Error al consultar la base de datos",
      });
    }

    res.json(results);
  });
});

// =========================
// POST - Agregar producto
// =========================

app.post("/productos", (req, res) => {
  const { producto } = req.body;

  if (!producto || !producto.trim()) {
    return res.status(400).json({
      error: "Debe ingresar un producto",
    });
  }

  const query = `
    INSERT INTO productos (producto)
    VALUES (?)
  `;

  db.query(query, [producto], (err, result) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        error: "Error al agregar el producto",
      });
    }

    io.emit("actualizarLista");
    console.log(">>> Evento actualizarLista enviado (POST)");

    res.status(201).json({
      mensaje: "Producto agregado correctamente",
      id: result.insertId,
    });
  });
});

// =========================
// PUT - Marcar / desmarcar producto
// =========================
app.put("/productos/:id", (req, res) => {
    const { id } = req.params;
    const { comprado } = req.body;

    const query = "UPDATE productos SET comprado = ? WHERE id = ?";

    db.query(query, [comprado, id], (err) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                error: "Error al actualizar el producto",
                
            });
        }

        // Avisar a todos los navegadores
        io.emit("actualizarLista");

        res.json({
            mensaje: "Producto actualizado correctamente",
        });
    });
});




// =========================
// DELETE - individual de productos con baja lógica
// =========================

app.delete("/productos/:id", (req, res) => {
  const { id } = req.params;

  const query = "UPDATE productos SET activo = FALSE, fecha_eliminado = CURRENT_TIMESTAMP WHERE id = ? ";

  db.query(query, [id], (err) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        error: "Error al eliminar el producto",
      });
    }

    io.emit("actualizarLista");
    console.log(">>> Evento actualizarLista enviado (DELETE)");

    res.json({
      mensaje: "Producto eliminado correctamente",
    });
  });
});

// =========================
// DELETE - Finalizar compra de todos los productos con baja logica
// =========================

app.delete("/productos", (req, res) => {
  const query = "UPDATE productos SET activo = FALSE, fecha_eliminado = CURRENT_TIMESTAMP WHERE activo = TRUE";

  db.query(query, (err) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        error: "Error al finalizar la compra",
      });
    }

    // actualiza los navegadores en tiempo real
    io.emit("actualizarLista");
    console.log(">>> Evento actualizarLista enviado (FINALIZAR)");

    res.json({
      mensaje: "Compra finalizada correctamente",
    });
  });
});

// =========================
// Iniciar servidor
// =========================

waitForDb().then(() => {
  console.log("MySQL conectado correctamente.");

  server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});