# Chantier `paiement-fedapay` · Paiement FedaPay fiable et suivi dans le backoffice

- **Spec** : [ADR 0008](../../adr/0008-paiement-fedapay-fiable.md) (section « Organisation du travail » : elle fait
  autorité sur les lots, les fichiers exclusifs et la table de contrôle).
- **Méthode** : [ADR 0007](../../adr/0007-methode-chantiers-paralleles.md), skill `chantier`. Chantier **pilote** du
  [plan 4](../methode-chantiers/4-chantier-pilote.md).
- **Branche du chantier** : `feature/paiement-fedapay`, partie de `development`. PR finale vers `development`,
  jamais fusionnée par un agent.

## Graphe

```
socle ──┬──> fedapay
        ├──> flux
        └──> api-backoffice ──> web-backoffice
```

## Tableau de bord

| # | Lot | Plan | Profil | Dépend de | Issue | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `socle` | [1-socle.md](1-socle.md) | `api` | — | [#200](https://github.com/tigamadou/steamy/issues/200) | ⬜ à faire |
| 2 | `fedapay` | [2-fedapay.md](2-fedapay.md) | `api` | socle | [#201](https://github.com/tigamadou/steamy/issues/201) | ⬜ à faire |
| 3 | `flux` | [3-flux.md](3-flux.md) | `api` | socle | [#202](https://github.com/tigamadou/steamy/issues/202) | ⬜ à faire |
| 4 | `api-backoffice` | [4-api-backoffice.md](4-api-backoffice.md) | `api` | socle | [#203](https://github.com/tigamadou/steamy/issues/203) | ⬜ à faire |
| 5 | `web-backoffice` | [5-web-backoffice.md](5-web-backoffice.md) | `web` | api-backoffice | [#204](https://github.com/tigamadou/steamy/issues/204) | ⬜ à faire |

Parallélisme maximal : 3 lots `api` simultanés (fedapay, flux, api-backoffice), dans la limite du budget mémoire
de [docs/infra/agents.md](../../infra/agents.md).

## Après le chantier (porteur du projet, hors plans)

Clés sandbox en préprod, webhook déclaré chez FedaPay (`transaction.*`, désactivation automatique décochée),
`manage.py fedapay_probe`, parcours complet avec `01 64 00 00 01` ; en production, un paiement réel par réseau
ouvert. Détail : ADR 0008, « Ce qui reste au porteur du projet ».
