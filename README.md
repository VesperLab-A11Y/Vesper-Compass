# Vesper Compass

## English

A public reference for the 87 WCAG 2.2 success criteria. For each one: what WCAG
says, the same idea in plain language, a fix to aim for, the groups of people it
affects, and the matching references in EN 301 549, RGAA 4.1 and Québec's
SGQRI 008 3.0.

One self-contained static page, no dependencies, no build step. **Bilingual,
English and French**: the language switch translates the content, not just the
interface. Self-hosted fonts, **no third-party requests**. Dark theme by
default, with a System / Dark / Light switch.

**Report mode** adds checkboxes: pick the criteria that apply to an audit, then
export the selection as CSV or PDF (the plain-language layers only, never the
commercial audit content).

The page also carries an **install card for Sonar**, the same reference as a
floating overlay you can open on any page you are auditing.

### Deployment

Published on VesperLab's site: <https://compass.vesperlab.dev/>

### Local development

The page loads its text and data with `fetch()`, so it must be served over HTTP.
Opened directly (`file://`), it stays blank.

```bash
python3 -m http.server 8000
# then http://localhost:8000/
```

### Structure

| Path | Role |
|---|---|
| `index.html` | Page structure, `data-i18n` keys, the Sonar install card |
| `style.css` | Vesper Lab V2 design tokens (copied from Vesper Library) + styles + `@media print` |
| `app.js` | i18n, search / filter, criterion cards, report mode, CSV / PDF export, theme |
| `i18n/fr.json`, `i18n/en.json` | Interface text, principle names, disability labels |
| `assets/wcag22-public.json` | The 87 criteria, generated from the shared dataset (no `erreur_type` / `impact_client`) |
| `assets/fonts/` | Noto Serif / Sans as self-hosted `.woff2` |
| `assets/` | Logo, favicons |

The criteria file is a copy of the one served by
[Vesper Toolkit](https://toolkit.vesperlab.dev/). Both come from
`vesper-compass-sonar-prive/wcag22_dataset.json` through
`tools/gen-datasets.mjs`. Do not edit the copy by hand.

### Contact

Found an accessibility barrier, a bug, or a translation error? Open an issue or
write to contact@vesperlab.dev.

If my work is useful to you, you can
[buy me a coffee](https://buymeacoffee.com/vesperlab).

## Français

Un référentiel public des 87 critères de succès WCAG 2.2. Pour chacun : ce que
disent les WCAG, la même idée en clair, une piste de correction, les publics
concernés, et les correspondances dans EN 301 549, le RGAA 4.1 et le
SGQRI 008 3.0 québécois.

Page unique, statique, sans dépendance ni étape de build. **Bilingue français /
anglais** : la bascule traduit aussi le contenu, pas seulement l'interface.
Polices auto-hébergées, **aucune requête tierce**. Thème sombre par défaut, avec
une bascule Système / Sombre / Clair.

Le **mode rapport** révèle des cases à cocher : choisir les critères retenus pour
un audit, puis exporter la sélection en CSV ou PDF (les couches grand public
seulement, jamais le contenu d'audit commercial).

La page porte aussi une **carte d'installation pour Sonar**, le même référentiel
en surcouche flottante, à ouvrir sur n'importe quelle page auditée.

### Déploiement

Publié sur le site de VesperLab : <https://compass.vesperlab.dev/>

### Développement local

La page charge ses textes et ses données via `fetch()` : elle doit donc être
servie en HTTP. Ouverte directement (`file://`), elle reste blanche.

```bash
python3 -m http.server 8000
# puis http://localhost:8000/
```

### Structure

| Chemin | Rôle |
|---|---|
| `index.html` | Structure de la page, clés `data-i18n`, carte d'installation Sonar |
| `style.css` | Jetons du design system Vesper Lab V2 (recopiés de Vesper Library) + styles + `@media print` |
| `app.js` | i18n, recherche / filtre, fiches critère, mode rapport, export CSV / PDF, thème |
| `i18n/fr.json`, `i18n/en.json` | Texte d'interface, noms de principes, libellés de handicap |
| `assets/wcag22-public.json` | Les 87 critères, générés depuis la base partagée (sans `erreur_type` / `impact_client`) |
| `assets/fonts/` | Noto Serif / Sans en `.woff2` auto-hébergés |
| `assets/` | Logo, favicons |

Le fichier des critères est une copie de celui que sert
[Vesper Toolkit](https://toolkit.vesperlab.dev/). Les deux viennent de
`vesper-compass-sonar-prive/wcag22_dataset.json` via `tools/gen-datasets.mjs`.
Ne pas éditer la copie à la main.

### Contact

Une barrière d'accessibilité, un bug ou une erreur de traduction ? Ouvrez une
issue ou écrivez à contact@vesperlab.dev.

Si mon travail vous est utile, vous pouvez
[financer mon apport en caféine](https://buymeacoffee.com/vesperlab).
