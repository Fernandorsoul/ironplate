#!/usr/bin/env node
/**
 * Gera src/constants/releaseNewsGenerated.ts a partir das GitHub Releases.
 *
 * Uso:
 *   npm run sync:release-news
 *   GITHUB_REPOSITORY=Fernandorsoul/ironplate GITHUB_TOKEN=... node scripts/sync-release-news.mjs
 *
 * Roda automaticamente no deploy (deploy.yml) e em EAS builds
 * (eas-build-post-install), para que cada release publicada apareça
 * na seção Novidades sem edição manual do app.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO = process.env.GITHUB_REPOSITORY || 'Fernandorsoul/ironplate';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const OUTPUT = path.join(
  __dirname,
  '..',
  'src',
  'constants',
  'releaseNewsGenerated.ts',
);

const MONTHS_PT = [
  'janeiro de',
  'fevereiro de',
  'março de',
  'abril de',
  'maio de',
  'junho de',
  'julho de',
  'agosto de',
  'setembro de',
  'outubro de',
  'novembro de',
  'dezembro de',
];

function formatReleaseDate(iso) {
  if (!iso) return 'Release recente';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Release recente';
  return `${MONTHS_PT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function pickIcon(release) {
  const text = `${release.name || ''} ${release.body || ''}`.toLowerCase();
  if (/bluetooth|balança|ble|scale/.test(text)) return 'bluetooth-outline';
  if (/segurança|security|auth|senha|lgpd|cpf/.test(text)) return 'shield-checkmark-outline';
  if (/nutri|dieta|refeição|meal|plano alimentar|cardápio/.test(text)) return 'restaurant-outline';
  if (/treino|workout|ficha|exercício/.test(text)) return 'barbell-outline';
  if (/peso|medida|weight|body|composição/.test(text)) return 'analytics-outline';
  if (/profissional|nutritionist|agendamento|appointment/.test(text)) return 'people-outline';
  if (/fix|correção|hotfix|bug/.test(text)) return 'construct-outline';
  return 'rocket-outline';
}

function pickBadge(release) {
  const text = `${release.name || ''} ${release.body || ''}`.toLowerCase();
  const tag = (release.tag_name || '').toLowerCase();
  if (/fix|correção|hotfix/.test(text) || tag.includes('fix')) return 'CORREÇÃO';
  if (/security|segurança|lgpd/.test(text)) return 'SEGURANÇA';
  if (/melhoria|improve|refactor|ux/.test(text)) return 'MELHORIA';
  return 'RELEASE';
}

function extractHighlights(body) {
  if (!body) return [];
  const lines = String(body)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = lines
    .filter((line) => /^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line))
    .map((line) => line.replace(/^([-*•]|\d+[.)])\s+/, ''))
    .map((line) => line.replace(/\[(.+?)\]\(.+?\)/g, '$1'))
    .map((line) => line.replace(/`/g, ''))
    .map((line) => line.replace(/\*\*(.+?)\*\*/g, '$1'))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 3 && line.length <= 160);

  return bullets.slice(0, 4);
}

function extractDescription(body, version) {
  if (!body) return `Novidades e melhorias entregues na versão ${version}.`;
  const withoutHeading = String(body)
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^[-*•]\s+/.test(line) && !/^\d+[.)]\s+/.test(line));

  const paragraph = withoutHeading
    .join(' ')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!paragraph) return `Novidades e melhorias entregues na versão ${version}.`;
  return paragraph.length > 180 ? `${paragraph.slice(0, 177).trim()}…` : paragraph;
}

function toCard(release, index) {
  const version = release.tag_name || release.name || `v${index + 1}`;
  const rawName = (release.name || '').trim();
  const titleLooksLikeTag = !rawName || rawName === version || /^v?\d+(\.\d+)*$/i.test(rawName);
  const title = titleLooksLikeTag ? `Versão ${version}` : rawName;
  return {
    badge: pickBadge(release),
    date: formatReleaseDate(release.published_at || release.created_at),
    icon: pickIcon(release),
    title: title.length > 70 ? `${title.slice(0, 67).trim()}…` : title,
    description: extractDescription(release.body, version),
    highlights: extractHighlights(release.body),
    featured: index === 0,
    version,
    url: release.html_url || undefined,
  };
}

function formatCardForTs(card, indent) {
  const pad = ' '.repeat(indent);
  const padInner = ' '.repeat(indent + 2);
  const lines = [
    `${pad}{`,
    `${padInner}badge: ${JSON.stringify(card.badge)},`,
    `${padInner}date: ${JSON.stringify(card.date)},`,
    `${padInner}icon: ${JSON.stringify(card.icon)},`,
    `${padInner}title: ${JSON.stringify(card.title)},`,
    `${padInner}description: ${JSON.stringify(card.description)},`,
  ];

  if (card.highlights.length > 0) {
    lines.push(`${padInner}highlights: [`);
    for (const highlight of card.highlights) {
      lines.push(`${padInner}  ${JSON.stringify(highlight)},`);
    }
    lines.push(`${padInner}],`);
  } else {
    lines.push(`${padInner}highlights: [],`);
  }

  if (card.featured) lines.push(`${padInner}featured: true,`);
  if (card.version) lines.push(`${padInner}version: ${JSON.stringify(card.version)},`);
  if (card.url) lines.push(`${padInner}url: ${JSON.stringify(card.url)},`);
  lines.push(`${pad}},`);
  return lines.join('\n');
}

async function fetchReleases() {
  const url = `https://api.github.com/repos/${REPO}/releases?per_page=20`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ironplate-release-news-sync',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} ao buscar releases de ${REPO}`);
  }
  const releases = await response.json();
  if (!Array.isArray(releases)) return [];
  return releases.filter((release) => !release.draft);
}

function writeGeneratedFile(cards) {
  const body = cards.map((card) => formatCardForTs(card, 2)).join('\n');
  const content = `import type { ReleaseNewsCard } from './releaseNewsTypes';

/**
 * Gerado automaticamente por scripts/sync-release-news.mjs a partir das
 * GitHub Releases publicadas. Não edite à mão — rode npm run sync:release-news.
 */
export const GENERATED_RELEASE_NEWS: ReleaseNewsCard[] = [
${body}
];
`;

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, content, 'utf8');
  return OUTPUT;
}

async function main() {
  try {
    const releases = await fetchReleases();
    const cards = releases.slice(0, 6).map((release, index) => toCard(release, index));
    const outputPath = writeGeneratedFile(cards);
    console.log(
      `release-news: ${cards.length} release(s) de ${REPO} gravadas em ${path.relative(process.cwd(), outputPath)}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`release-news: falha ao sincronizar (${message}). Mantendo dados gerados atuais.`);
    if (!fs.existsSync(OUTPUT)) {
      writeGeneratedFile([]);
    }
    // Não falha o build: o app continua com cards curatoriais + último snapshot.
    process.exit(0);
  }
}

main();
