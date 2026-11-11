/* Résonance — les nouveautés annoncées aux enseignants (fenêtre « ✨ Nouveautés », gestion.js).
   À la connexion, un enseignant voit une fois les éditions qu'il n'a pas encore vues ; le numéro de la
   dernière vue est gardé dans reglages_prof.nouveautes_vues (migration 008), donc sur tous ses appareils.
   Il les revoit quand il veut : Tableau de bord → « ✨ Nouveautés ».

   AJOUTER UNE ÉDITION (à chaque évolution qui change quelque chose pour les collègues) :
     · en tête de liste, avec n = le plus grand numéro + 1 (jamais réutiliser un numéro) ;
     · peu de mots : ce qui change pour eux, où le trouver ; pas le détail technique ;
     · un visuel par point : un petit aperçu en HTML, avec les classes nv-… de gestion.js
       (nv-ecran, nv-ligne, nv-case, nv-pastille, nv-bouton, nv-puce…) ; pas d'image à télécharger ;
     · public : 'prof' (seul public prévu pour l'instant). */
window.RESONANCE_NOUVEAUTES = [
  {
    n: 1,
    date: '2026-11-11',
    titre: 'Vos élèves, votre affichage, un mot à M. Van Hoorde',
    public: 'prof',
    points: [
      {
        titre: 'Mes élèves : masquer, ou demander une suppression',
        texte: 'Tableau de bord → « Mes élèves » : tous les comptes de vos classes. Cochez « Masquer » pour retirer un élève de vos listes, « À supprimer » pour un compte en double : M. Van Hoorde l’efface.',
        visuel:
          '<div class="nv-ecran">' +
            '<div class="nv-ligne nv-tete"><span>Élève</span><span>Masquer</span><span>À supprimer</span></div>' +
            '<div class="nv-ligne"><span class="nv-id">PC-7K2QM</span><span class="nv-case"></span><span class="nv-case"></span></div>' +
            '<div class="nv-ligne nv-barre"><span class="nv-id">PC-7K2QX <i class="nv-puce">même nom</i></span><span class="nv-case"></span><span class="nv-case nv-oui nv-rouge">✓</span></div>' +
            '<div class="nv-ligne nv-pale"><span class="nv-id">PC-TEST1</span><span class="nv-case nv-oui">✓</span><span class="nv-case"></span></div>' +
          '</div>'
      },
      {
        titre: 'Un affichage à votre main',
        texte: '« ⚙︎ Personnaliser l’affichage », en haut du Tableau de bord : décochez les rubriques qui ne vous servent pas. Rien n’est effacé, et le réglage vous suit sur vos autres appareils.',
        visuel:
          '<div class="nv-ecran">' +
            '<div class="nv-titre">⚙︎ Personnaliser l’affichage</div>' +
            '<div class="nv-choix"><span class="nv-case nv-oui">✓</span> Demandes à apparier</div>' +
            '<div class="nv-choix"><span class="nv-case nv-oui">✓</span> Mes élèves</div>' +
            '<div class="nv-choix nv-pale"><span class="nv-case"></span> Signalements</div>' +
          '</div>'
      },
      {
        titre: 'Écrire à M. Van Hoorde, de n’importe où',
        texte: 'Le bouton ✉️ en bas à droite, sur toutes les pages : une demande, une modification, un compte à créer… Plus besoin de mot dans le casier. Sa réponse s’affiche au même endroit. Pas de nom d’élève : l’identifiant PC-… suffit.',
        visuel:
          '<div class="nv-ecran nv-coin">' +
            '<div class="nv-bulle">Bonjour, pouvez-vous ajouter mon groupe du jeudi ?</div>' +
            '<span class="nv-bouton">✉️ Écrire à M. Van Hoorde</span>' +
          '</div>'
      }
    ]
  }
];
