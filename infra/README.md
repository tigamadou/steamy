# infra/

Fichiers d'infrastructure de Steamy. **La documentation est dans [`docs/infra/`](../docs/infra/README.md).**

| Dossier | Rôle | Documentation |
| --- | --- | --- |
| `ansible/` | Préparation d'un VPS de zéro : durcissement, k3s, cert-manager, CloudNativePG, compte `deploy` | [Serveurs](../docs/infra/serveurs.md) |
| `helm/steamy/` | Chart de l'application : web, api, worker, beat, migrations, ingress | [Kubernetes](../docs/infra/kubernetes.md) |
| `helm/steamy-platform/` | Chart des services avec état et des sauvegardes | [Données et sauvegardes](../docs/infra/donnees-et-sauvegardes.md) |
| `deploy/steamy-deploy.sh` | Script exécuté sur le serveur par la CI (seule commande autorisée à sa clé SSH) | [CI/CD](../docs/infra/ci-cd.md) |
| `dev/` | Configuration de la stack Docker locale | [Développement local](../docs/infra/developpement-local.md) |

Premier environnement à créer ? Suivre [Mise en place](../docs/infra/mise-en-place.md).
