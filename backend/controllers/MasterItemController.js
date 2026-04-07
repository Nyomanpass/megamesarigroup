import { MasterItem } from "../models/MasterItem.js";
import { ItemCategory } from "../models/ItemCategory.js";


// 🔹 GET ALL
export const getMasterItems = async (req, res) => {
  try {
    const { tipe } = req.query; // 🔥 ambil filter dari query

    const where = {};

    if (tipe) {
      where.tipe = tipe;
    }

    const data = await MasterItem.findAll({
      where,
      include: [
        {
          model: ItemCategory,
          attributes: ["id", "nama"] // 🔥 ambil nama kategori saja
        }
      ],
      order: [["id", "DESC"]]
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 GET BY ID
export const getMasterItemById = async (req, res) => {
  try {
    const data = await MasterItem.findByPk(req.params.id, {
      include: ItemCategory
    });

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 CREATE
export const createMasterItem = async (req, res) => {
  try {
    const { nama, tipe, satuan, harga_default, category_id } = req.body;

    const data = await MasterItem.create({
      nama,
      tipe,
      satuan,
      harga_default,
      category_id
    });

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 UPDATE
export const updateMasterItem = async (req, res) => {
  try {
    let { nama, tipe, satuan, harga_default, category_id } = req.body;

    const data = await MasterItem.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    // 🔥 FIX UTAMA
    if (!category_id || tipe !== "BAHAN") {
      category_id = null;
    }

    await data.update({
      nama,
      tipe,
      satuan,
      harga_default,
      category_id
    });

    res.json({ message: "Data berhasil diupdate", data });
  } catch (error) {
    console.log(error); // 🔥 biar kelihatan di terminal
    res.status(500).json({ message: error.message });
  }
};

// 🔹 DELETE
export const deleteMasterItem = async (req, res) => {
  try {
    const data = await MasterItem.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.destroy();

    res.json({ message: "Data berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


