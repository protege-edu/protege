# Installer Protégé

Environ 15 minutes la première fois, surtout le temps que le cerveau de Gloam se télécharge. Il vous faut un
portable Windows ou Mac que l'école vous permet d'utiliser pour le travail des élèves (idéalement un ordinateur
géré par votre conseil scolaire, voir [faire fonctionner Protégé dans une école](board/hosting-for-boards.html),
en anglais). Les élèves n'installent rien.

> Les écrans des élèves sont en français et en anglais. Les pages de l'enseignant sont en anglais pour l'instant :
> ce guide nomme donc leurs boutons en anglais, en **gras**.

<h2 id="get-it">1. Le télécharger</h2>

<p class="guide-get"><a class="btn primary" data-download href="DOWNLOAD_WINDOWS">Télécharger Protégé</a> <span>Ou : <a href="DOWNLOAD_WINDOWS">Windows</a>, <a href="DOWNLOAD_MAC">Mac</a></span></p>

Protégé fonctionne sur le **portable de l'enseignante ou de l'enseignant**, sous Windows 10 ou 11, ou sur un Mac.
Les Chromebooks sont pour les élèves : ils se joignent à la classe dans le navigateur, avec un code.

<h2 id="install">2. L'installer</h2>

<div class="os-steps" data-os-only="windows">

**Sur Windows**, ouvrez **Protege-Setup.exe** dans vos téléchargements et appuyez sur **Installer**. Protégé
s'installe pour vous seulement : aucun droit d'administrateur n'est nécessaire.

Protégé est gratuit, donc il n'a pas de signature payante de Microsoft. La première fois, Windows peut l'arrêter
avec une boîte bleue. Choisissez **Informations complémentaires**, puis **Exécuter quand même** :

<figure class="howto" aria-label="À quoi ressemble l'avertissement de Windows">
  <div class="mock win">
    <p class="mock-title">Windows a protégé votre ordinateur</p>
    <p>Microsoft Defender SmartScreen a empêché le démarrage d'une application non reconnue.</p>
    <p class="mock-link is-hint">Informations complémentaires</p>
    <div class="mock-buttons"><span class="mock-btn is-hint">Exécuter quand même</span><span class="mock-btn">Ne pas exécuter</span></div>
  </div>
  <figcaption>Appuyez sur <b>Informations complémentaires</b>, puis sur <b>Exécuter quand même</b>. Une seule fois.</figcaption>
</figure>

</div>

<div class="os-steps" data-os-only="mac">

**Sur un Mac**, ouvrez **Protege.dmg** et glissez **Protégé** dans **Applications**. Ouvrez-le ensuite depuis
Applications.

Protégé est gratuit, donc il n'a pas de signature payante d'Apple. La première fois, votre Mac dit qu'il ne peut
pas le vérifier. Appuyez sur **OK**, puis ouvrez **Réglages Système → Confidentialité et sécurité**, faites
défiler vers le bas et appuyez sur **Ouvrir quand même** :

<figure class="howto" aria-label="À quoi ressemble le réglage du Mac">
  <div class="mock mac">
    <p class="mock-title">Sécurité</p>
    <p>« Protégé » a été bloqué afin de protéger votre Mac.</p>
    <div class="mock-buttons"><span class="mock-btn is-hint">Ouvrir quand même</span></div>
  </div>
  <figcaption>Dans <b>Réglages Système → Confidentialité et sécurité</b>, appuyez sur <b>Ouvrir quand même</b>. Une seule fois.</figcaption>
</figure>

</div>

<h2 id="wake">3. Gloam se réveille</h2>

Protégé s'ouvre dans votre navigateur et s'installe tout seul : il installe **Ollama** (le programme gratuit qui
fait fonctionner l'IA de Gloam sur votre portable) et télécharge **le cerveau de Gloam** (quelques Go, une seule
fois). Il vous dit combien de temps il reste. Vous pouvez créer votre compte pendant le téléchargement, et faire
autre chose en attendant.

<figure class="shot-in-guide"><img src="img/setup.webp" width="1366" height="768" alt="Protégé s'installe : Gloam dort dans la vallée de nuit pendant que son cerveau se télécharge, à côté d'une carte pour créer votre compte." loading="lazy"></figure>

- **Gardez votre code de récupération.** C'est ce qui vous permet de revenir si vous oubliez votre mot de passe
  (Protégé n'envoie pas de courriels).
- **Les voix** (facultatif, environ 850 Mo) : Protégé vous demande si vous les voulez. Les élèves peuvent alors
  parler à Gloam au lieu de taper (leur voix est transformée en mots sur votre portable et jamais enregistrée), et
  la lecture à voix haute utilise la voix naturelle de Gloam au lieu de la voix robotique de chaque appareil.

> Windows peut demander si Node.js peut utiliser le réseau. Permettez-le sur les réseaux **privés**, pour que les
> élèves sur le Wi-Fi de l'école puissent joindre votre portable.

## 4. Créer une classe et une leçon

- **Créez une classe** et choisissez son année. L'année choisit l'apparence et la façon de parler de Gloam :
  quatre mondes différents, du pré ensoleillé de livre d'images pour la maternelle à la vallée de nuit pour le
  secondaire.
- **Ajoutez des leçons** : téléversez vos notes (PDF, PowerPoint, Word) ou collez-les, aussi longues que vous
  voulez : un sujet ou une unité entière. Protégé coupe les longues notes en leçons à vos titres (chacune est une
  partie que Gloam peut lire d'un coup), et vous pouvez déplacer les coupures. Gloam les prépare une à la fois,
  quelques minutes chacune : les idées clés, les erreurs que les élèves font souvent, et son histoire.
  **Lisez chacune, changez ce que vous voulez, puis approuvez-la.** Les élèves ne voient jamais que des leçons
  approuvées.
- **Donnez les leçons à votre classe** : directement sur une leçon approuvée, ou sur la page de la classe
  (**Add a lesson**, ou une unité entière d'un coup). Les élèves les voient dans l'ordre que vous choisissez.
- Ou commencez avec la leçon intégrée, « Pourquoi y a-t-il des saisons? »

Les autres enseignants de votre école : appuyez sur **Make an invite code** sur votre page et
donnez-le-leur.

## 5. En classe

1. Ouvrez **Protégé** depuis votre bureau ou le menu Démarrer (gardez le portable branché et réveillé).
2. Sur la page de votre classe, appuyez sur **Show the code** et projetez-le.
3. Les élèves vont sur **protege-edu.pages.dev/fr/j** (le même lien à chaque cours : ajoutez-le aux favoris ou
   épinglez-le dans Google Classroom) et tapent le code affiché, comme GLOW-42-25RM. Il les envoie vers votre
   portable, donc ils doivent être sur le même Wi-Fi. Ils choisissent un surnom et leurs images secrètes; la
   fois suivante, ils touchent leur surnom et leurs images, sur n'importe quel Chromebook. (Les téléphones et
   tablettes peuvent balayer le code QR.)
4. Suivez la page de la classe : les bougies de chaque élève, qui bloque, et ce que pense la classe. Ouvrez un
   élève pour lire sa conversation avec Gloam, et corrigez toute bougie que Gloam aurait mal estimée.

**Pause the class** endort tous les Gloam quand vous voulez l'attention de tout le monde. Quand vous
avez fini, fermez la fenêtre de Protégé (ou appuyez sur **Stop Protégé** dans **Ready for class?**).

## Quand les élèves n'arrivent pas à joindre votre portable (Wi-Fi d'école qui sépare les appareils)

Beaucoup de réseaux d'école empêchent les appareils de se joindre entre eux : les Chromebooks des élèves ne
peuvent pas ouvrir l'adresse de votre portable. Ouvrez alors **Protégé en ligne** depuis le menu Démarrer au
lieu de **Protégé**. Il ouvre un tunnel rapide Cloudflare gratuit : votre portable et les élèves se connectent
tous vers Internet, donc ça marche sur n'importe quel réseau, même de la maison. Aucun compte n'est nécessaire,
et Protégé va chercher lui-même le petit programme de tunnel de Cloudflare la première fois.

- Les élèves vont sur **protege-edu.pages.dev/fr/j** et tapent le code affiché sur **Show the code**, comme
  GLOW-42-K7Q2. Ou appuyez sur **Copy link for students** et publiez le lien une fois dans Google Classroom :
  c'est le même lien à chaque cours (votre portable garde sa « salle » sur le site), et il indique que la classe
  n'est pas ouverte quand Protégé ne fonctionne pas en ligne.
- Votre portable fait toujours tout le travail : gardez-le allumé et éveillé pendant le cours.
- Clairement : les serveurs de Cloudflare peuvent voir ce que les élèves tapent dans un tunnel rapide. C'est
  correct pour essayer Protégé; pour de vrais cours, vérifiez que votre école est d'accord, ou demandez au
  service informatique de laisser les appareils des élèves joindre votre portable sur le réseau de l'école
  (alors aucun tunnel n'est nécessaire).

## Vérifier que tout fonctionne

Sur la page de l'enseignant, **Ready for class?** vérifie l'IA de Gloam, la dictée vocale, l'adresse des
élèves, l'espace disque et les sauvegardes, et dit quoi faire pour tout ce qui n'est pas prêt.

<h2 id="update">Sauvegardes et mises à jour</h2>

- Protégé se sauvegarde chaque jour où il fonctionne (les 7 derniers jours sont gardés). **Restaurer une
  sauvegarde**, dans le menu Démarrer, revient à un jour précédent.
- **Check for updates** (dans Ready for class?) vous dit quand une nouvelle version existe.
  Téléchargez de nouveau le programme d'installation sur cette page et lancez-le : vos classes et vos élèves
  restent là.
- **Pour le soutien informatique** : `Protege-Setup.exe /VERYSILENT` installe sans poser de questions, et les
  versions portables ([Windows](DOWNLOAD_WINDOWS_ZIP), [Mac](DOWNLOAD_MAC_ZIP)) ne demandent aucune installation.
  `PROTEGE_SETUP=off` dans `protege.env` empêche Protégé d'installer ou de télécharger quoi que ce soit au
  démarrage (si vous gérez Ollama vous-mêmes).

## En cas de problème

- **« Gloam's brain isn't running »** : ouvrez l'application Ollama. Les élèves appuient sur
  Réessayer; rien n'est perdu.
- **Les élèves ne joignent pas l'adresse** : vérifiez qu'ils sont sur le même réseau, et que Windows a permis
  Node.js sur les réseaux privés. Certains réseaux scolaires isolent les appareils : demandez à votre service
  informatique.
- **Un élève a oublié ses images** : ouvrez-le sur la page de la classe et appuyez sur **Reset their
  pictures**.
- **Vous avez oublié votre mot de passe** : utilisez votre code de récupération avec **Forgot your password?**
