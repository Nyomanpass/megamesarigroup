import { ProjectAnalisaDetail } from "../models/ProjekAnalisaDetail.js";
import { ProjectItem } from "../models/ProjekItem.js";
import { ProjectAnalisa } from "../models/ProjekAnalisa.js";
import { generateBobotInternal } from "./BoqController.js";
import { Boq } from "../models/BoqModel.js";
import Decimal from "decimal.js";
import { applyPriceFormula } from "../utils/priceFormula.js";

const toDecimal = (value) => new Decimal(value || 0);
const toNumber = (value) => Number(value.toString());
const toPembulatan = (value) => Number(value.floor().toString());
const shouldUsePembulatan = (value) => value !== false && value !== 0 && value !== "0";

export const getProjectAnalisaDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔥 ambil analisa + project_id
    const analisa = await ProjectAnalisa.findByPk(id);

    if (!analisa) {
      return res.status(404).json({ message: "Analisa tidak ditemukan" });
    }

    // 🔥 ambil detail + join item project
    const details = await ProjectAnalisaDetail.findAll({
      where: { project_analisa_id: id },
      include: [
        {
          model: ProjectItem,
          as: "item",
          attributes: ["id", "nama", "tipe", "satuan", "harga", "project_id"]
        },
        {
        model: ProjectAnalisa,
          as: "analisa", // 🔥 penting
          attributes: ["id", "nama"]
        }
      ]
    });

    // 🔥 GROUPING
    let tenaga = [];
    let bahan = [];
    let alat = [];

    let totalTenaga = new Decimal(0);
    let totalBahan = new Decimal(0);
    let totalAlat = new Decimal(0);

    details.forEach((d) => {
    if (!d.item) return;
    if (d.item.project_id !== analisa.project_id) return;

    const hargaDasar = toDecimal(d.item.harga);
    const harga = applyPriceFormula(hargaDasar, d.rumus_harga);
    const koef = toDecimal(d.koefisien);
    const jumlah = koef.mul(harga);

    const item = {
        id: d.id,
        item_id: d.item.id,
        nama: d.item.nama,
        tipe: d.item.tipe,
        satuan: d.item.satuan,
        koefisien: toNumber(koef),
        rumus_harga: d.rumus_harga || "",
        harga_dasar: toNumber(hargaDasar),
        harga: toNumber(harga),
        jumlah: toNumber(jumlah)
    };

    if (d.item.tipe === "TENAGA") {
        tenaga.push(item);
        totalTenaga = totalTenaga.plus(jumlah);
    } else if (d.item.tipe === "BAHAN") {
        bahan.push(item);
        totalBahan = totalBahan.plus(jumlah);
    } else {
        alat.push(item);
        totalAlat = totalAlat.plus(jumlah);
    }
    });

    const total = totalTenaga.plus(totalBahan).plus(totalAlat);

    const persen = toDecimal(analisa.overhead_persen);
    const overhead = total.mul(persen).div(100);
    const grandTotal = total.plus(overhead);
    const pembulatan = toPembulatan(grandTotal);
    const usePembulatan = shouldUsePembulatan(analisa.use_pembulatan);
    const hargaSatuanPekerjaan = usePembulatan ? pembulatan : toNumber(grandTotal);

    // 🔥 RESPONSE FINAL (TAMBAH INFO PROJECT)
    res.json({
      project_id: analisa.project_id, // 🔥 tambahan penting
      analisa_id: analisa.id,
      kode: analisa.kode,
      satuan: analisa.satuan,
      overhead_persen: toNumber(persen),

      tenaga,
      bahan,
      alat,

      totalTenaga: toNumber(totalTenaga),
      totalBahan: toNumber(totalBahan),
      totalAlat: toNumber(totalAlat),

      total: toNumber(total),
      overhead: toNumber(overhead),
      grandTotal: toNumber(grandTotal),
      pembulatan,
      use_pembulatan: usePembulatan,
      harga_satuan_pekerjaan: hargaSatuanPekerjaan,
      nama: analisa.nama,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const createProjectAnalisaDetail = async (req, res) => {
  try {
    const { project_analisa_id, item_id, koefisien, rumus_harga } = req.body;
    const item = await ProjectItem.findByPk(item_id);

    if (!item) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    applyPriceFormula(item.harga, rumus_harga);

    const data = await ProjectAnalisaDetail.create({
      project_analisa_id,
      item_id,
      koefisien,
      rumus_harga: rumus_harga || null
    });

    // 🔥 CARI BOQ YANG PAKAI ANALISA INI
    const boqList = await Boq.findAll({
      where: { analisa_id: project_analisa_id }
    });

    const projectIds = [...new Set(boqList.map(b => b.project_id))];

    // 🔥 UPDATE BOBOT
    for (let pid of projectIds) {
      await generateBobotInternal(pid);
    }

    res.status(201).json({
      message: "Berhasil tambah + bobot otomatis",
      data
    });

  } catch (error) {
    const status = error.message?.includes("Rumus harga") ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};


export const updateProjectAnalisaDetail = async (req, res) => {
  try {
    const data = await ProjectAnalisaDetail.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const itemId = req.body.item_id ?? data.item_id;
    const rumusHarga = req.body.rumus_harga ?? data.rumus_harga;
    const item = await ProjectItem.findByPk(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    applyPriceFormula(item.harga, rumusHarga);

    const updatePayload = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(req.body, "rumus_harga")) {
      updatePayload.rumus_harga = req.body.rumus_harga || null;
    }

    await data.update(updatePayload);

    // 🔥 AMBIL ANALISA
    const analisa = await ProjectAnalisa.findByPk(data.project_analisa_id);

    if (analisa) {
      // 🔥 CARI SEMUA BOQ YANG PAKAI ANALISA INI
      const boqList = await Boq.findAll({
        where: { analisa_id: analisa.id }
      });

      // 🔥 AMBIL PROJECT YANG TERPAKAI
      const projectIds = [...new Set(boqList.map(b => b.project_id))];

      // 🔥 UPDATE BOBOT PER PROJECT
      for (let pid of projectIds) {
        await generateBobotInternal(pid);
      }
    }

    res.json({ message: "Berhasil update + bobot otomatis", data });

  } catch (error) {
    const status = error.message?.includes("Rumus harga") ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

export const deleteProjectAnalisaDetail = async (req, res) => {
  try {
    const data = await ProjectAnalisaDetail.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const analisa_id = data.project_analisa_id;

    await data.destroy();

    // 🔥 CARI BOQ YANG PAKAI ANALISA INI
    const boqList = await Boq.findAll({
      where: { analisa_id }
    });

    const projectIds = [...new Set(boqList.map(b => b.project_id))];

    // 🔥 UPDATE BOBOT
    for (let pid of projectIds) {
      await generateBobotInternal(pid);
    }

    res.json({
      message: "Berhasil hapus + bobot otomatis"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
