import express from 'express';
import path from 'path';
const app = express();
const publicDir = path.join(process.cwd(), 'public');

app.use(express.json());

app.get('/api/news', (req, res) => {
  res.json({
    items: [
      { id: 'n1', title: 'Lancio piattaforma', excerpt: 'Anteprima locale per QA', image: '/img/hero.svg', url: '#', date: new Date().toISOString() }
    ]
  });
});

app.use(express.static(publicDir));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Dev server listening on http://localhost:${port}`));

export default app;
