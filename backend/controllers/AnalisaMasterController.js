import { AnalisaMaster } from "../models/AnalisaMaster.js";

// 🔹 CREATE
export const createAnalisa = async (req, res) => {
  try {
    const { kode, nama, satuan, overhead_persen } = req.body;

    if (!kode || !nama || !satuan) {
      return res.status(400).json({ message: "Field wajib diisi!" });
    }

    const data = await AnalisaMaster.create({
      kode,
      nama,
      satuan,
      overhead_persen
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 GET ALL
export const getAnalisa = async (req, res) => {
  try {
    const data = await AnalisaMaster.findAll({
      order: [["id", "DESC"]]
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 GET BY ID
export const getAnalisaById = async (req, res) => {
  try {
    const data = await AnalisaMaster.findOne({
      where: { id: req.params.id }
    });

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 UPDATE
export const updateAnalisa = async (req, res) => {
  try {
    const { kode, nama, satuan, overhead_persen } = req.body;

    const data = await AnalisaMaster.findOne({
      where: { id: req.params.id }
    });

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.update({
      kode,
      nama,
      satuan,
      overhead_persen
    });

    res.json({ message: "Berhasil update" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 DELETE
export const deleteAnalisa = async (req, res) => {
  try {
    const data = await AnalisaMaster.findOne({
      where: { id: req.params.id }
    });

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.destroy();

    res.json({ message: "Berhasil hapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};