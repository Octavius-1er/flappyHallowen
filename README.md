# Witchy Flap

Jeu façon Flappy Bird sur le thème d'Halloween, pour un cours d'anglais.

Les questions se modifient dans `questions.js`. Chaque entrée a le format `{ q, choices, answer }` :

```js
{ q: "How do you say 'citrouille' in English?", choices: ["Pumpkin", "Pumpking", "Potato"], answer: 0 }
```

`q` est l'énoncé, `choices` la liste des réponses proposées, et `answer` l'index de la bonne réponse (à partir de 0).

Rien n'est enregistré. Les pièces, le score et les achats restent en mémoire : un rafraîchissement de la page remet tout à zéro.
