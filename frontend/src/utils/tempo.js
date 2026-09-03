// Transforma data + hora em um objeto Date. Sem data, usa uma data base fixa
// só para conseguir calcular a diferença entre os horários.
function paraData(data, hora) {
  if (!hora) return null;
  const base = data || '2000-01-01';
  const d = new Date(`${base}T${hora}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Diferença em minutos entre dois momentos. Se o segundo for menor que o
// primeiro, assume que virou o dia (voo que chega na madrugada seguinte).
export function minutosEntre(dataA, horaA, dataB, horaB) {
  const inicio = paraData(dataA, horaA);
  let fim = paraData(dataB, horaB);

  if (!inicio || !fim) return null;

  if (fim <= inicio) {
    fim = new Date(fim.getTime() + 24 * 60 * 60 * 1000);
  }

  return Math.round((fim - inicio) / 60000);
}

export function formatarDuracao(minutos) {
  if (minutos === null || minutos === undefined) return '';

  const horas = Math.floor(minutos / 60);
  const min = minutos % 60;

  if (horas === 0) return `${min}min`;
  if (min === 0) return `${horas}h`;
  return `${horas}h ${String(min).padStart(2, '0')}min`;
}

// Tempo de voo de um trecho
export function tempoDeVoo(trecho) {
  return minutosEntre(trecho.data, trecho.hora_saida, trecho.data, trecho.hora_chegada);
}

// Tempo de escala entre um trecho e o seguinte
export function tempoDeEscala(anterior, proximo) {
  return minutosEntre(
    anterior.data, anterior.hora_chegada,
    proximo.data || anterior.data, proximo.hora_saida
  );
}

/*
 * Recebe os trechos de um mesmo voo (um grupo) e devolve os tempos:
 * cada voo, cada escala e o total da porta a porta.
 */
export function calcularTemposDoGrupo(trechos) {
  const voos = trechos.map((t) => tempoDeVoo(t));

  const escalas = trechos.slice(0, -1).map((t, i) => ({
    aeroporto: t.destino || '',
    minutos: tempoDeEscala(t, trechos[i + 1]),
  }));

  // Total = soma dos voos + soma das escalas (só se tudo estiver preenchido)
  const todosPreenchidos =
    voos.every((v) => v !== null) && escalas.every((e) => e.minutos !== null);

  const total = todosPreenchidos
    ? voos.reduce((s, v) => s + v, 0) + escalas.reduce((s, e) => s + e.minutos, 0)
    : null;

  return { voos, escalas, total };
}

// Agrupa os trechos pelo campo "grupo" (voos desvinculados ficam separados)
export function agruparTrechos(trechos) {
  const mapa = new Map();

  for (const trecho of trechos) {
    const grupo = trecho.grupo ?? 0;
    if (!mapa.has(grupo)) mapa.set(grupo, []);
    mapa.get(grupo).push(trecho);
  }

  return [...mapa.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([grupo, lista]) => ({ grupo, trechos: lista }));
}

// Um voo que chega antes da hora em que saiu chegou no dia seguinte
export function chegaNoDiaSeguinte(horaSaida, horaChegada) {
  if (!horaSaida || !horaChegada) return false;
  return horaChegada <= horaSaida;
}

export function somarDias(data, dias) {
  if (!data) return '';
  const d = new Date(`${data.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Data real da chegada, considerando o voo que atravessa a meia-noite
export function dataDeChegada(data, horaSaida, horaChegada) {
  return chegaNoDiaSeguinte(horaSaida, horaChegada) ? somarDias(data, 1) : data;
}
