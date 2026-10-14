# Witchy Flap

Jeu façon Flappy Bird sur le thème d'Halloween, pour un cours d'anglais.

Les questions se modifient dans `questions.js`. Chaque entrée a le format `{ q, choices, answer }` :

```js
{ q: "How do you say 'citrouille' in English?", choices: ["Pumpkin", "Pumpking", "Potato"], answer: 0 }
```

`q` est l'énoncé, `choices` la liste des réponses proposées, et `answer` l'index de la bonne réponse (à partir de 0).

En vol, une porte remplace une colonne toutes les 4 colonnes ordinaires. L'énoncé s'affiche en haut ; chaque ouverture porte une réponse en anglais. La bonne donne des bonbons selon la série (x1, puis x2, puis x3). La mauvaise fait perdre un cœur. Tous les 5 portails, un boss pose des questions à choix (8 secondes, 3 boutons). Cinq bonnes réponses le vainquent, donnent un gros bonus de bonbons, et le vol reprend dans le monde suivant.

Rien n'est enregistré. Les pièces, le score et les achats restent en mémoire : un rafraîchissement de la page remet tout à zéro.

## Musique

La boucle de fond est **Spooky Loop**, de wipics. Licence : domaine public (CC0). Le fichier du jeu garde le passage qui se boucle, d'environ 3,96 s à 19,70 s.

Source : https://opengameart.org/content/spooky-loop
