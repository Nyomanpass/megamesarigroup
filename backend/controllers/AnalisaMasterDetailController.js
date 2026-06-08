import { AnalisaMasterDetail } from "../models/AnalisaMasterDetail.js";
import { MasterItem } from "../models/MasterItem.js";
import { AnalisaMaster } from "../models/AnalisaMaster.js";
import Decimal from "decimal.js";
import { applyPriceFormula } from "../utils/priceFormula.js";

const toDecimal = (value) => new Decimal(value || 0);
const toNumber = (value) => Number(value.toString());
const toPembulatan = (value) => Number(value.floor().toString());
const shouldUsePembulatan = (value) => value !== false && value !== 0 && value !== "0";

export const getAnalisaDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const analisa = await AnalisaMaster.findByPk(id);

    const details = await AnalisaMasterDetail.findAll({
      where: { analisa_id: id },
      include: [
        {
          model: MasterItem,
          as: "item",
          attributes: ["id", "nama", "tipe", "satuan", "harga"]
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

    const persen = toDecimal(analisa?.overhead_persen);
    const overhead = total.mul(persen).div(100);

    const grandTotal = total.plus(overhead);
    const pembulatan = toPembulatan(grandTotal);
    const usePembulatan = shouldUsePembulatan(analisa?.use_pembulatan);
    const hargaSatuanPekerjaan = usePembulatan ? pembulatan : toNumber(grandTotal);

    res.json({
      analisa_id: analisa?.id,
      kode: analisa?.kode,
      nama: analisa?.nama,
      satuan: analisa?.satuan,
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
      harga_satuan_pekerjaan: hargaSatuanPekerjaan
    });

  } catch (error) {
    const status = error.message?.includes("Rumus harga") ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

export const createAnalisaDetail = async (req, res) => {
  try {
    const { analisa_id, item_id, koefisien, rumus_harga } = req.body;
    const item = await MasterItem.findByPk(item_id);

    if (!item) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    applyPriceFormula(item.harga, rumus_harga);

    const data = await AnalisaMasterDetail.create({
      analisa_id,
      item_id,
      koefisien,
      rumus_harga: rumus_harga || null
    });

    res.status(201).json(data);
  } catch (error) {
    const status = error.message?.includes("Rumus harga") ? 400 : 500;
    res.status(status).json({ message: error.message });
  }
};

export const updateAnalisaDetail = async (req, res) => {
  try {
    const data = await AnalisaMasterDetail.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const itemId = req.body.item_id ?? data.item_id;
    const rumusHarga = req.body.rumus_harga ?? data.rumus_harga;
    const item = await MasterItem.findByPk(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item tidak ditemukan" });
    }

    applyPriceFormula(item.harga, rumusHarga);

    const updatePayload = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(req.body, "rumus_harga")) {
      updatePayload.rumus_harga = req.body.rumus_harga || null;
    }

    await data.update(updatePayload);

    res.json({ message: "Berhasil update" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteAnalisaDetail = async (req, res) => {
  try {
    const data = await AnalisaMasterDetail.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    await data.destroy();

    res.json({ message: "Berhasil hapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
