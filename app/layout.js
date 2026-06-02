export const metadata = { title: 'Sameiro Educacional — Gestão de Alunos', description: 'Plataforma de gestão de alunos' }

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f0f2f7' }}>
        {children}
      </body>
    </html>
  )
}
