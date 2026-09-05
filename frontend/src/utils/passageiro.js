/*
 * Faixa etária pela data de nascimento, considerando a idade que a pessoa
 * terá no dia do voo. Mesma regra usada no backend: bebê até completar
 * 2 anos, criança até os 16, adulto acima disso.
 */
export function classificarPassageiro(dataNascimento, dataViagem) {
  if (!dataNascimento || !dataViagem) return null;

  const nascimento = new Date(`${dataNascimento.slice(0, 10)}T12:00:00`);
  const viagem = new Date(`${dataViagem.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(nascimento.getTime()) || Number.isNaN(viagem.getTime())) return null;

  let idade = viagem.getFullYear() - nascimento.getFullYear();

  const mes = viagem.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && viagem.getDate() < nascimento.getDate())) idade--;

  if (idade < 0) return null;
  if (idade < 2) return 'bebe';
  if (idade <= 16) return 'crianca';
  return 'adulto';
}

export function rotuloTipo(tipo) {
  if (tipo === 'bebe') return 'Bebê';
  if (tipo === 'crianca') return 'Criança';
  if (tipo === 'adulto') return 'Adulto';
  return 'informe o nascimento';
}

// Idade na data do voo, para mostrar junto da faixa
export function idadeNaViagem(dataNascimento, dataViagem) {
  if (!dataNascimento || !dataViagem) return null;

  const nascimento = new Date(`${dataNascimento.slice(0, 10)}T12:00:00`);
  const viagem = new Date(`${dataViagem.slice(0, 10)}T12:00:00`);

  let idade = viagem.getFullYear() - nascimento.getFullYear();
  const mes = viagem.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && viagem.getDate() < nascimento.getDate())) idade--;

  return idade >= 0 ? idade : null;
}
