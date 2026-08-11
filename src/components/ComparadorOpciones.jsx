import React, { useState, useMemo } from "react";

// ---------- Lógica de cálculo ----------
function calcularMetricas(op) {
  const { tipo, precioSubyacente, strike, prima, dte, delta, contratos } = op;
  const nContratos = contratos || 1;
  const ingresoNeto = prima * 100 * nContratos;

  // Colateral: PUT = cash-secured (strike), CALL = covered (coste acciones)
  const colateral =
    tipo === "PUT" ? strike * 100 * nContratos : precioSubyacente * 100 * nContratos;

  const roi = colateral > 0 ? (ingresoNeto / colateral) * 100 : 0;
  const roiAnualizado = dte > 0 ? roi * (365 / dte) : 0;

  const breakeven = tipo === "PUT" ? strike - prima : strike + prima;

  const margenSeguridad =
    precioSubyacente > 0
      ? tipo === "PUT"
        ? ((precioSubyacente - breakeven) / precioSubyacente) * 100
        : ((breakeven - precioSubyacente) / precioSubyacente) * 100
      : 0;

  const probOTM = delta != null && delta !== "" ? (1 - Math.abs(delta)) * 100 : null;

  const cumpleDelta = delta != null && delta !== "" ? Math.abs(delta) >= 0.2 && Math.abs(delta) <= 0.25 : null;
  const cumpleDTE = dte >= 30 && dte <= 45;

  return { ingresoNeto, colateral, roi, roiAnualizado, breakeven, margenSeguridad, probOTM, cumpleDelta, cumpleDTE };
}

const emptyForm = {
  ticker: "",
  tipo: "PUT",
  precioSubyacente: "",
  strike: "",
  prima: "",
  dte: "",
  delta: "",
  ivRank: "",
  contratos: "1",
};

const STORAGE_KEY = "diario-opciones-comparador";

export default function ComparadorOpciones() {
  const [operaciones, setOperaciones] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [form, setForm] = useState(emptyForm);
  const [sortKey, setSortKey] = useState("roiAnualizado");
  const [sortDir, setSortDir] = useState("desc");
  const [error, setError] = useState("");

  // Guarda automáticamente cada vez que cambia la lista (red de seguridad ante cierres accidentales)
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operaciones));
    } catch {
      // localStorage lleno o no disponible: se ignora silenciosamente
    }
  }, [operaciones]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const addOperacion = () => {
    const required = ["ticker", "precioSubyacente", "strike", "prima", "dte"];
    for (const r of required) {
      if (form[r] === "" || form[r] === null) {
        setError("Rellena ticker, precio, strike, prima y DTE como mínimo.");
        return;
      }
    }
    setError("");
    const nueva = {
      id: crypto.randomUUID(),
      ticker: form.ticker.toUpperCase(),
      tipo: form.tipo,
      precioSubyacente: parseFloat(form.precioSubyacente),
      strike: parseFloat(form.strike),
      prima: parseFloat(form.prima),
      dte: parseInt(form.dte, 10),
      delta: form.delta === "" ? null : parseFloat(form.delta),
      ivRank: form.ivRank === "" ? null : parseFloat(form.ivRank),
      contratos: form.contratos === "" ? 1 : parseInt(form.contratos, 10),
    };
    setOperaciones((prev) => [...prev, nueva]);
    setForm(emptyForm);
  };

  const eliminar = (id) => setOperaciones((prev) => prev.filter((o) => o.id !== id));

  const filas = useMemo(() => {
    const conMetricas = operaciones.map((op) => ({ ...op, ...calcularMetricas(op) }));
    return conMetricas.sort((a, b) => {
      const va = a[sortKey] ?? -Infinity;
      const vb = b[sortKey] ?? -Infinity;
      return sortDir === "desc" ? vb - va : va - vb;
    });
  }, [operaciones, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const fmt = (n, dec = 2) => (n == null || Number.isNaN(n) ? "—" : n.toFixed(dec));

  return (
    <div className="min-h-screen bg-[#0F1419] text-[#E5E9EC] font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <p className="text-xs tracking-[0.2em] text-[#5B8C7B] uppercase mb-1">Diario Opciones · Módulo</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#E5E9EC]">Comparador de Ventas de Opciones</h1>
          <p className="text-sm text-[#8B96A0] mt-1">
            Introduce cada operación candidata y compara rentabilidad anualizada, margen de seguridad y si cumple tus criterios de entrada (delta 0.20–0.25, DTE 30–45).
          </p>
          {operaciones.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`¿Borrar las ${operaciones.length} operaciones de la tabla?`)) setOperaciones([]);
              }}
              className="mt-3 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-[#3A1E1E] text-[#F87171] hover:bg-[#3A1E1E] transition-colors"
            >
              🗑️ Limpiar todo ({operaciones.length})
            </button>
          )}
        </header>

        {/* Formulario */}
        <div className="bg-[#161C24] border border-[#232B35] rounded-lg p-4 md:p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Campo label="Ticker">
              <input value={form.ticker} onChange={handleChange("ticker")} placeholder="ASML" className="input" />
            </Campo>
            <Campo label="Tipo">
              <select value={form.tipo} onChange={handleChange("tipo")} className="input">
                <option value="PUT">PUT (venta)</option>
                <option value="CALL">CALL (covered)</option>
              </select>
            </Campo>
            <Campo label="Precio subyacente">
              <input type="number" step="0.01" value={form.precioSubyacente} onChange={handleChange("precioSubyacente")} placeholder="680.00" className="input" />
            </Campo>
            <Campo label="Strike">
              <input type="number" step="0.01" value={form.strike} onChange={handleChange("strike")} placeholder="650" className="input" />
            </Campo>
            <Campo label="Prima ($/€)">
              <input type="number" step="0.01" value={form.prima} onChange={handleChange("prima")} placeholder="8.50" className="input" />
            </Campo>
            <Campo label="DTE">
              <input type="number" value={form.dte} onChange={handleChange("dte")} placeholder="35" className="input" />
            </Campo>
            <Campo label="Delta (abs, opcional)">
              <input type="number" step="0.01" value={form.delta} onChange={handleChange("delta")} placeholder="0.22" className="input" />
            </Campo>
            <Campo label="IV Rank % (opcional)">
              <input type="number" step="1" value={form.ivRank} onChange={handleChange("ivRank")} placeholder="45" className="input" />
            </Campo>
            <Campo label="Contratos">
              <input type="number" min="1" value={form.contratos} onChange={handleChange("contratos")} className="input" />
            </Campo>
            <div className="flex items-end">
              <button onClick={addOperacion} className="w-full h-[38px] rounded-md bg-[#34D399] text-[#0F1419] font-medium text-sm flex items-center justify-center gap-1 hover:bg-[#2BB988] transition-colors">
                ➕ Añadir
              </button>
            </div>
          </div>
          {error && <p className="text-[#F87171] text-xs mt-2">{error}</p>}
        </div>

        {/* Tabla */}
        {filas.length === 0 ? (
          <div className="text-center py-16 text-[#5C6773] text-sm border border-dashed border-[#232B35] rounded-lg">
            Añade operaciones arriba para empezar a comparar.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#232B35]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#161C24] text-[#8B96A0] text-xs uppercase tracking-wide">
                  <Th label="Ticker" k="ticker" onClick={toggleSort} active={sortKey} />
                  <Th label="Tipo" k="tipo" onClick={toggleSort} active={sortKey} />
                  <Th label="Strike" k="strike" onClick={toggleSort} active={sortKey} />
                  <Th label="Prima" k="prima" onClick={toggleSort} active={sortKey} />
                  <Th label="DTE" k="dte" onClick={toggleSort} active={sortKey} />
                  <Th label="Colateral" k="colateral" onClick={toggleSort} active={sortKey} />
                  <Th label="ROI" k="roi" onClick={toggleSort} active={sortKey} />
                  <Th label="ROI Anual." k="roiAnualizado" onClick={toggleSort} active={sortKey} />
                  <Th label="Breakeven" k="breakeven" onClick={toggleSort} active={sortKey} />
                  <Th label="Margen Seg." k="margenSeguridad" onClick={toggleSort} active={sortKey} />
                  <Th label="Prob OTM" k="probOTM" onClick={toggleSort} active={sortKey} />
                  <th className="px-3 py-2 text-left">Criterios</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={f.id} className={i % 2 === 0 ? "bg-[#0F1419]" : "bg-[#11161D]"}>
                    <td className="px-3 py-2 font-mono font-medium">{f.ticker}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${f.tipo === "PUT" ? "bg-[#1E3A2E] text-[#34D399]" : "bg-[#2A2340] text-[#A78BFA]"}`}>
                        {f.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">{fmt(f.strike)}</td>
                    <td className="px-3 py-2 font-mono">{fmt(f.prima)}</td>
                    <td className="px-3 py-2 font-mono">{f.dte}</td>
                    <td className="px-3 py-2 font-mono">{fmt(f.colateral, 0)}</td>
                    <td className="px-3 py-2 font-mono">{fmt(f.roi)}%</td>
                    <td className="px-3 py-2 font-mono font-semibold">
                      <span className={f.roiAnualizado >= 15 ? "text-[#34D399]" : "text-[#E5E9EC]"}>
                        {fmt(f.roiAnualizado)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">{fmt(f.breakeven)}</td>
                    <td className="px-3 py-2 font-mono">{fmt(f.margenSeguridad)}%</td>
                    <td className="px-3 py-2 font-mono">{f.probOTM != null ? fmt(f.probOTM, 0) + "%" : "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Badge ok={f.cumpleDTE} label="DTE" />
                        {f.cumpleDelta != null && <Badge ok={f.cumpleDelta} label="Δ" />}
                        {f.ivRank != null && <Badge ok={f.ivRank >= 30} label="IVR" />}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => eliminar(f.id)} className="text-[#5C6773] hover:text-[#F87171] transition-colors">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filas.length > 0 && (
          <p className="text-xs text-[#5C6773] mt-3">
            Ordenado por {sortKey} ({sortDir === "desc" ? "mayor a menor" : "menor a mayor"}). Haz clic en cualquier cabecera para reordenar. Colateral: PUT = strike×100×contratos, CALL = precio subyacente×100×contratos.
          </p>
        )}
      </div>

      <style>{`
        .input {
          background: #0F1419;
          border: 1px solid #232B35;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13px;
          color: #E5E9EC;
          width: 100%;
          outline: none;
        }
        .input:focus {
          border-color: #34D399;
        }
        table { border-collapse: collapse; }
      `}</style>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wide text-[#5C6773] mb-1">{label}</label>
      {children}
    </div>
  );
}

function Th({ label, k, onClick, active }) {
  return (
    <th
      className={`px-3 py-2 text-left cursor-pointer select-none hover:text-[#E5E9EC] transition-colors ${active === k ? "text-[#34D399]" : ""}`}
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label} <span style={{ opacity: 0.6 }}>⇅</span>
      </span>
    </th>
  );
}

function Badge({ ok, label }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 ${
        ok ? "bg-[#1E3A2E] text-[#34D399]" : "bg-[#3A1E1E] text-[#F87171]"
      }`}
    >
      {ok ? "✓" : "✗"}
      {label}
    </span>
  );
}
