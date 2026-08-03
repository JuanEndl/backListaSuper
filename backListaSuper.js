require('dotenv').config(); // carga las variables del .env
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MySQL usando pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función para esperar a que MySQL esté listo
const waitForDb = () => {
  return new Promise((resolve) => {
    const check = () => {
      db.query("SELECT 1", (err) => {
        if (err) {
          console.log("Esperando a que MySQL esté listo...");
          setTimeout(check, 2000); // reintenta cada 2 segundos
        } else {
          resolve();
        }
      });
    };
    check();
  });
};




// Ruta para traer todos los productos
app.get("/productos", (req, res) => {
  db.query("select * from productos;", (err, results) => {
    if (err) {
      console.error("Error en la consulta:", err);
      res.status(500).json({ error: "Error en la consulta a la base de datos" });
    } else {
      res.json(results);
    }
  });
});

// Esperar a que MySQL esté listo y luego arrancar servidor
waitForDb().then(() => {
  console.log("MySQL está listo, arrancando servidor...");
  app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  });
});
