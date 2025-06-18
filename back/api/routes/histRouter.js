import express from "express";
import { promisePool } from "../config/db.js";
import logger from "../config/logger.js";

const router = express.Router();

/**
 * Função utilitária para data/hora no formato brasileiro
 */
function getBrazilDateTime() {
  const date = new Date().toLocaleString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).replace(" ", "T");
  return date;
}

/**
 * POST /hist/pontos
 * Registra pontos após leitura do QR code
 */
router.post("/pontos", async (req, res) => {
  /*
    #swagger.tags = ['Histórico']
    #swagger.summary = 'POST para registrar pontos após leitura do QR code'
    #swagger.description = 'Registra pontos no histórico do usuário'
  */
  try {
    const { id, idUser, points } = req.body;
    if (!id || !idUser || !points) {
      logger.warn({
        message: "Campos obrigatórios ausentes em /hist/pontos",
        body: req.body,
        rota: "/hist/pontos",
      });
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }
    const brazilDate = getBrazilDateTime();
    const query = `
      INSERT INTO histPoints (id, points, idUser, date)
      VALUES (?, ?, ?, ?)
    `;
    await promisePool.execute(query, [id, points, idUser, brazilDate]);
    logger.info({
      message: "Histórico de pontos registrado",
      id, idUser, points, date: brazilDate,
      rota: "/hist/pontos"
    });
    res.status(200).json({ message: "Histórico de pontos registrado com sucesso." });
  } catch (error) {
    logger.error({
      message: "Erro ao registrar histórico de pontos",
      error: error.message,
      stack: error.stack,
      rota: "/hist/pontos"
    });
    res.status(500).json({ error: "Erro ao registrar histórico de pontos.", details: error.message });
  }
});

/**
 * POST /hist/transacoes
 * Registra uma transação de benefício
 */
router.post("/transacoes", async (req, res) => {
  /*
    #swagger.tags = ['Histórico']
    #swagger.summary = 'POST para registrar uma transação de benefício'
    #swagger.description = 'Registra uma transação no histórico do usuário'
  */
  try {
    const { idUser, description, points } = req.body;
    if (!idUser || !description || !points) {
      logger.warn({
        message: "Campos obrigatórios ausentes em /hist/transacoes",
        body: req.body,
        rota: "/hist/transacoes",
      });
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }
    const brazilDate = getBrazilDateTime();
    const query = `
      INSERT INTO histTransactions (description, points, idUser, date)
      VALUES (?, ?, ?, ?)
    `;
    await promisePool.execute(query, [description, points, idUser, brazilDate]);
    logger.info({
      message: "Histórico de transação registrado",
      idUser, description, points, date: brazilDate,
      rota: "/hist/transacoes"
    });
    res.status(200).json({ message: "Histórico de transação registrado com sucesso." });
  } catch (error) {
    logger.error({
      message: "Erro ao registrar transação",
      error: error.message,
      stack: error.stack,
      rota: "/hist/transacoes"
    });
    res.status(500).json({ error: "Erro ao registrar transação.", details: error.message });
  }
});

/**
 * GET /hist/:idUser
 * Retorna histórico de pontos e transações de um usuário, filtrado por data
 */
router.get("/:idUser", async (req, res) => {
  /*
    #swagger.tags = ['Histórico']
    #swagger.summary = 'GET histórico de pontos e transações de um usuário'
    #swagger.description = 'Retorna histórico de pontos e transações de um usuário, filtrado por data'
  */
  try {
    const { idUser } = req.params;
    const { start, end } = req.query;
    const startDateTime = start ? `${start} 00:00:00` : "1970-01-01 00:00:00";
    const endDateTime = end ? `${end} 23:59:59` : "2999-12-31 23:59:59";

    let [pointsHistory] = await promisePool.execute(
      `SELECT id, idUser, points, date, 'ponto' AS tipo FROM histPoints 
       WHERE idUser = ? AND date BETWEEN ? AND ?`,
      [idUser, startDateTime, endDateTime]
    );

    let [transactionsHistory] = await promisePool.execute(
      `SELECT id, idUser, description, points, date, 'transacao' AS tipo FROM histTransactions 
       WHERE idUser = ? AND date BETWEEN ? AND ?`,
      [idUser, startDateTime, endDateTime]
    );

    function formatDateToBrazil(date) {
      return new Date(date).toLocaleString("pt-BR");
    }

    const history = [...pointsHistory, ...transactionsHistory]
      .map(item => ({
        ...item,
        date: formatDateToBrazil(item.date),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    logger.info({
      message: "Histórico consultado",
      idUser,
      startDateTime,
      endDateTime,
      quantidade: history.length,
      rota: "/hist/:idUser"
    });

    res.status(200).json(history);
  } catch (error) {
    logger.error({
      message: "Erro ao buscar histórico",
      error: error.message,
      stack: error.stack,
      rota: "/hist/:idUser"
    });
    res.status(500).json({ error: "Erro ao buscar histórico.", details: error.message });
  }
});

/**
 * GET /hist
 * Retorna o histórico de pontos e transações de todos os usuários, agrupado por idUser, filtrado por data
 */
router.get("/", async (req, res) => {
  /*
    #swagger.tags = ['Histórico']
    #swagger.summary = 'GET histórico de todos os usuários'
    #swagger.description = 'Retorna o histórico de pontos e transações de todos os usuários, agrupado por idUser, filtrado por data'
  */
  try {
    const { start, end } = req.query;
    const startDateTime = start ? `${start} 00:00:00` : "1970-01-01 00:00:00";
    const endDateTime = end ? `${end} 23:59:59` : "2999-12-31 23:59:59";

    let [pointsHistory] = await promisePool.execute(
      `SELECT id, idUser, points, date, 'ponto' AS tipo FROM histPoints 
       WHERE date BETWEEN ? AND ?`,
      [startDateTime, endDateTime]
    );

    let [transactionsHistory] = await promisePool.execute(
      `SELECT id, idUser, description, points, date, 'transacao' AS tipo FROM histTransactions 
       WHERE date BETWEEN ? AND ?`,
      [startDateTime, endDateTime]
    );

    function formatDateToBrazil(date) {
      return new Date(date).toLocaleString("pt-BR");
    }

    const history = [...pointsHistory, ...transactionsHistory]
      .map(item => ({
        ...item,
        date: formatDateToBrazil(item.date),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Agrupa por idUser
    const result = history.reduce((acc, item) => {
      if (!acc[item.idUser]) acc[item.idUser] = [];
      acc[item.idUser].push(item);
      return acc;
    }, {});

    logger.info({
      message: "Histórico consultado",
      idUser: "todos",
      startDateTime,
      endDateTime,
      quantidade: history.length,
      rota: "/hist"
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error({
      message: "Erro ao buscar histórico",
      error: error.message,
      stack: error.stack,
      rota: "/hist"
    });
    res.status(500).json({ error: "Erro ao buscar histórico.", details: error.message });
  }
});

export default router;
