require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 5000;

// =========================
// Middlewares
// =========================
app.use(cors());
app.use(express.json());

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
  const query = "SELECT * FROM productos WHERE activo = TRUE ORDER BY id";

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

    res.status(201).json({
      mensaje: "Producto agregado correctamente",
      id: result.insertId,
    });
  });
});


// =========================
// DELETE - Baja lógica de un producto
// =========================
app.delete("/productos/:id", (req, res) => {
  const { id } = req.params;

  const query = "UPDATE productos SET activo = FALSE WHERE id = ?";

  db.query(query, [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: "Error al eliminar el producto",
      });
    }

    res.json({
      mensaje: "Producto eliminado correctamente",
    });
  });
});

// =========================
// DELETE - Finalizar compra
// =========================
app.delete("/productos", (req, res) => {
  const query = "UPDATE productos SET activo = FALSE WHERE activo = TRUE";

  db.query(query, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: "Error al finalizar la compra",
      });
    }

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

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});