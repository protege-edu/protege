# Bien démarrer avec Protégé

Protégé est un site Web : rien à télécharger ni à installer. Le personnel enseignant l'utilise à
[protege-edu.vercel.app/teacher](https://protege-edu.vercel.app/teacher). Les élèves se joignent à
**protege-edu.pages.dev/fr/j**, sur n'importe quel Chromebook, ordinateur ou tablette.

> Les écrans des élèves sont en français et en anglais. Les pages de l'enseignant sont en anglais pour l'instant :
> ce guide nomme donc leurs boutons en anglais, en **gras**.

<h2 id="sign-up">1. Inscrivez-vous avec le code du personnel de votre école</h2>

Allez sur [protege-edu.vercel.app/teacher](https://protege-edu.vercel.app/teacher) et créez votre compte. Il
vous faut le **code du personnel** de votre école. Demandez-le à votre direction, ou à un collègue de votre
école qui utilise déjà Protégé : il le voit sous **Your school**, sur sa page d'enseignant.

Pourquoi un code? Les élèves et le personnel ont les mêmes adresses courriel d'école, donc un courriel ne peut
pas prouver qui enseigne. Le code du personnel, oui.

Pas encore de code? Votre école n'a donc pas encore été ajoutée. C'est la personne qui gère Protégé qui l'ajoute
(voir [pour la personne qui gère Protégé](#owner)).

**Gardez votre code de récupération.** C'est ce qui vous permet de revenir si vous oubliez votre mot de passe.

## 2. Créez une classe

Créez une classe et choisissez son année. L'année choisit l'apparence et la façon de parler de Gloam : quatre
mondes différents, du pré ensoleillé de livre d'images pour la maternelle à la vallée de nuit pour le
secondaire.

## 3. Ajoutez une leçon et approuvez-la

- **Ajoutez vos notes** : un fichier PDF, PowerPoint ou Word, ou collez-les. Votre fichier est lu dans votre
  propre navigateur et n'est jamais téléversé : seul le texte que vous choisissez va à Gloam. Les longues notes
  sont coupées en leçons à vos titres, et vous pouvez déplacer les coupures.
- **Gloam prépare chaque leçon** : les idées clés, les erreurs que les élèves font souvent, les questions qu'il
  posera, et son histoire.
- **Lisez-la, changez ce que vous voulez, puis approuvez-la.** Les élèves ne voient jamais que des leçons
  approuvées.
- **Donnez-la à votre classe**, directement sur la leçon approuvée, ou sur la page de la classe (**Add a
  lesson**, ou une unité entière d'un coup).

Ou commencez avec la leçon intégrée, « Pourquoi y a-t-il des saisons? »

<h2 id="in-class">4. En classe</h2>

1. Sur la page de votre classe, appuyez sur **Show the code** et projetez-le.
2. Les élèves vont sur **protege-edu.pages.dev/fr/j** et tapent le code, comme GLOW-42. C'est le même lien à
   chaque cours : ajoutez-le aux favoris ou épinglez-le dans Google Classroom. (Les téléphones et tablettes
   peuvent balayer le code QR.)
3. Ils choisissent un surnom et leurs images secrètes. La fois suivante, ils touchent leur surnom et leurs
   images, sur n'importe quel Chromebook.
4. **Demandez à chaque élève de vous dire son surnom** la première fois, pour savoir qui est qui. Protégé ne
   garde jamais de vrais noms.
5. Suivez la page de la classe : les bougies de chaque élève, qui bloque, et ce que pense la classe. Ouvrez un
   élève pour lire sa conversation avec Gloam, et corrigez toute bougie que Gloam aurait mal estimée.

**Pause the class** endort tous les Gloam quand vous voulez l'attention de tout le monde.

<h2 id="owner">Pour la personne qui gère Protégé</h2>

Le premier compte créé dans Protégé est celui du **propriétaire** : la personne qui le gère. Le propriétaire a
une **page du propriétaire** (**Owner page**,
[protege-edu.vercel.app/teacher/owner](https://protege-edu.vercel.app/teacher/owner)).

- **Ajouter une école** : tapez son nom et appuyez sur **Add school**. Protégé lui donne un code du personnel.
  Cochez **I teach here too** si c'est votre école.
- **Envoyez le code du personnel par courriel d'école**, par exemple à la direction, qui le transmet au
  personnel. Ne l'affichez jamais là où des élèves pourraient le voir.
- **Si un code se rend à un élève**, appuyez sur **Make a new code** (tout enseignant de cette école peut le
  faire aussi, sous **Your school**). L'ancien code cesse de fonctionner tout de suite, et les enseignants déjà
  inscrits gardent leur compte. Sous **Your school**, le personnel voit aussi qui s'est inscrit avec le code, et
  peut retirer quiconque n'enseigne pas à cette école.
- **Un enseignant est bloqué** (mot de passe oublié et code de récupération perdu) : créez-lui un nouveau code
  de récupération sur la page du propriétaire, et remettez-le-lui en personne.

<h2 id="limits">Limites quotidiennes et coût</h2>

Le cerveau de Gloam, c'est Claude (Claude Haiku 5.5), une IA créée par Anthropic. L'hébergement de Protégé est
gratuit (Vercel, Turso et Cloudflare Pages). La seule chose qui coûte de l'argent, c'est Claude : environ
11 cents pour une classe de 30 élèves qui envoient 40 messages chacun.

- **Les limites quotidiennes** plafonnent le nombre de messages que chaque élève et chaque classe peuvent
  envoyer à Gloam dans une journée, le nombre de leçons que chaque enseignant peut préparer, et le total pour
  tout Protégé. Quand une limite est atteinte, Gloam s'endort, à sa façon, jusqu'au lendemain, et plus rien
  n'est envoyé à Claude. La page du propriétaire montre l'utilisation du jour et son coût approximatif.
- **Fixez une limite de dépenses mensuelle** dans le compte Anthropic qui paie pour Claude, pour que la facture
  ne dépasse jamais ce que vous avez choisi.

<h2 id="trouble">En cas de problème</h2>

- **Le cerveau de Gloam ne répond pas** : l'appareil de l'élève a perdu Internet, ou Claude est occupé un
  instant. L'élève appuie sur **Réessayer**. Rien de ce qu'il a tapé n'est perdu.
- **Gloam s'est endormi pour le reste de la journée** : une limite quotidienne a été atteinte. Gloam se
  réveille demain.
- **Les élèves n'arrivent pas à ouvrir l'adresse** : vérifiez qu'ils l'ont tapée exactement, ou publiez le lien
  de **Show the code** dans Google Classroom. Certains réseaux scolaires bloquent les nouveaux sites : le
  service informatique de votre école peut les permettre.
- **Votre code du personnel ne fonctionne pas** : il a peut-être été remplacé. Demandez le nouveau code à votre
  direction ou à un collègue de votre école.
- **Un élève a oublié ses images** : ouvrez-le sur la page de la classe et appuyez sur **Reset their
  pictures**. Il en choisira de nouvelles la fois suivante.
- **Vous avez oublié votre mot de passe** : utilisez votre code de récupération avec **Forgot your password?**
  sur la page de connexion. Vous l'avez perdu aussi? La personne qui gère Protégé peut vous en créer un nouveau.
