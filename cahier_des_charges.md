# Cahier des charges — SeChair (gestion de stock de fauteuils roulants)

## 1. Contexte et objectif
SeChair vise à gérer un parc de fauteuils roulants avec différents modèles et tailles, en stock limité. Le système doit permettre d’identifier chaque fauteuil via un numéro unique pouvant être converti en code-barres, afin de faciliter la traçabilité, la réservation et l’utilisation.

## 2. Utilisateurs cibles
- **Agents / gestionnaires du stock** : créent et maintiennent l’inventaire, attribuent les fauteuils, gèrent les retours.
- **Utilisateurs finaux** : réservent un fauteuil d’une taille/modèle donnée et déclarent l’utilisation et le retour.

## 3. Périmètre fonctionnel

### 3.1 Fonctionnalités obligatoires (MVP)
- **Catalogue de fauteuils**
  - Gestion des tailles (ex. S, M, L, XL).
  - Gestion des modèles (ex. standard, électrique, pliable, etc.).
- **Identification unique**
  - Attribution d’un numéro unique par fauteuil.
  - Préparation de l’identifiant pour transformation en code-barres (format stable et lisible).
- **Réservation**
  - Un utilisateur choisit une taille et un modèle.
  - Le système réserve un fauteuil disponible correspondant.
- **Cycle d’utilisation**
  - Passage à l’état **« utilisé »** lors du retrait.
  - Passage à l’état **« rendu »** lors du retour.
- **Disponibilité**
  - Décompte automatique des stocks disponibles par taille/modèle.
  - Blocage d’un fauteuil pendant la réservation et l’utilisation.

### 3.2 Fonctionnalités optionnelles (V1+)
- Génération et impression des codes-barres.
- Historique d’utilisation par fauteuil et par utilisateur.
- Alertes de stock bas.
- Gestion des maintenances (fauteuil indisponible).
- Multi-sites (plusieurs lieux de stockage).

## 4. Parcours utilisateur (résumé)
1. L’utilisateur se connecte.
2. Il sélectionne la **taille** et le **modèle**.
3. Le système attribue un fauteuil disponible et crée une réservation.
4. À la remise du fauteuil, l’utilisateur ou l’agent marque le fauteuil **« utilisé »**.
5. Au retour, l’utilisateur ou l’agent marque le fauteuil **« rendu »**.

## 5. Données principales
- **Fauteuil** : id unique, taille, modèle, état (disponible / réservé / utilisé / rendu), date d’ajout, historique.
- **Utilisateur** : id, nom, rôle (gestionnaire / utilisateur).
- **Réservation** : id, fauteuil, utilisateur, date de début, date de fin, statut.

## 6. Contraintes & règles de gestion
- Un fauteuil ne peut être réservé que s’il est **disponible**.
- Un fauteuil **utilisé** ne peut pas être réattribué.
- Un fauteuil **rendu** repasse **disponible** après validation.
- Chaque fauteuil possède un **numéro unique** non réutilisé.

## 7. Livrables attendus
- Cahier des charges validé.
- Spécifications fonctionnelles détaillées.
- Maquettes (si application web ou mobile).
- Implémentation (MVP) et documentation utilisateur.

## 8. Critères de réussite
- L’inventaire est toujours à jour et fiable.
- Les réservations empêchent les conflits.
- L’identification unique permet une traçabilité par fauteuil.
- Les utilisateurs peuvent facilement réserver, utiliser et rendre un fauteuil.

## 9. Points à préciser
- Types exacts de tailles et modèles à gérer.
- Durée maximale d’une réservation.
- Processus de validation du retour.
- Besoin d’un système de comptes et de rôles détaillés.
- Support multi-sites (oui/non).
