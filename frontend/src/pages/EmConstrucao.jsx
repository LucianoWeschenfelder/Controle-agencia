export default function EmConstrucao({ titulo, descricao }) {
  return (
    <div className="pagina em-construcao">
      <span className="em-construcao-icone">🚧</span>
      <h2>{titulo}</h2>
      <p>{descricao}</p>
      <p className="em-construcao-nota">Esta tela ainda será desenvolvida.</p>
    </div>
  );
}
