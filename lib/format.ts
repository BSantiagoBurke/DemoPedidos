const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** "$18.000". Se quita el espacio que agrega Intl entre el signo y el número. */
export function formatARS(value: number): string {
  return ars.format(value).replace(/\s/g, "");
}

/** Normaliza texto para búsquedas: minúsculas y sin tildes. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function onlyDigits(text: string): string {
  return text.replace(/\D/g, "");
}
