/**
 * Package about defines the Credits, Contact, Donate, and Code panels, each
 * toggled by its button in the page footer. The Credits panel also carries
 * the cited works, the image credits, and the licenses.
 *
 * TODO: (#0) The anchors in `CREDITS` and `WORKS` open in a new tab without
 * carrying `rel="noopener noreferrer"`, unlike the anchors built by
 * `html.anchor`. Add the attribute.
 */

import * as html from './html.js';
import * as help from './help.js';

enum TITLE {
  CREDITS = 'Credits',
  WORKS = 'Cited Works',
  IMAGES = 'Image Credits',
  LICENSE = 'License',
  CONTACT = 'Contact',
  DONATE = 'Donate',
  CODE = 'Code',
}

enum ID {
  CITED_WORKS = 'cited-works',
  CONTACT = 'contact',
  DONATE = 'donate',
  CODE = 'code',
}

/**
 * CREDITS thanks the people whose dedication made this work possible.
 */
const CREDITS = `
<p>This work is made possible through the dedication of:</p>

<ol>
  <li>Milan Konvicka, creator of <a href="https://marcion.sourceforge.net/" target="_blank">Marcion</a>.</li>

  <li>Randy Komforty, creator of <a href="https://coptic.wiki/" target="_blank">CopticWiki</a>.</li>

  <li>Dr. Hany Takla, founder of <a href="http://stshenouda.org" target="_blank">St. Shenouda the Archimandrite Coptic Society</a>.</li>
</ol>
`;

/**
 * WORKS is the list of works that our data is derived from.
 *
 * TODO: (#305) Link the new version of the Comprehensive Coptic Lexicon, once
 * available.
 */
const WORKS = `
<ul>
  <li><em><a href="https://marcion.sourceforge.net/" target="_blank">Marcion</a></em>, by Milan Konvicka.</li>

  <li><em><a href="https://coptic.wiki/" target="_blank">CopticWiki</a></em>, by Randy Komforty.</li>

  <li><em><a href="https://www.coptist.com/2025/07/30/digitised-bibliography-crum/" target="_blank">Digitised bibliography of Crum's "List of Abbreviations"</a></em>, The Coptist.</li>

  <li>
    <em><a href="https://refubium.fu-berlin.de/handle/fub188/27813" target="_blank">Comprehensive Coptic Lexicon</a></em> (<a href="https://aaew.bbaw.de/tla/" target="_blank">BBAW/Thesaurus Linguae Aegyptiae project</a>, <a href="https://dioskoros.org/" target="_blank">FU Berlin/DDGLC project</a>), DOI <a href="https://doi.org/10.17169/refubium-27566" target="_blank">10.17169/refubium-27566</a>.
  </li>

  <li>
    <em><a href="https://coptic-dictionary.org/" target="_blank">Coptic Dictionary Online</a></em>, ed. by the <a href="https://kellia.uni-goettingen.de/" target="_blank">Koptische/Coptic Electronic Language and Literature International Alliance (KELLIA)</a>.
  </li>

  <li>
    <em>ⲡⲓⲁⲛⲥⲁϫⲓ ⲛ̀ϯⲁⲥⲡⲓ ⲛ̀ⲣⲉⲙⲛ̀ⲭⲏⲙⲓ | <span dir="rtl">قاموس اللغة القبطية</span></em>, <span dir="rtl">معوض داود عبدالنور</span>, <a href="https://copticocc.org/" target="_blank">The Coptic Orthodox Cultural Center</a>.
  </li>

  <li>
    <em><span dir="rtl">قاموس قبطي عربي لكلمات اللهجة البحيرية</span></em>, <span dir="rtl">دير القديس أنبا مقار ببرية شيهيت</span> (<a href="https://stmacariusmonastery.org/?lang=en" target="_blank">Monastery of Saint Macarius the Great</a>).
  </li>

  <li><em><a href="http://www.stshenouda.org/coptic-Bible-app" target="_blank">Coptic Bible App</a></em>, by St. Shenouda the Archimandrite Coptic Society.</li>

  <li><em><a href="https://copticscriptorium.org/" target="_blank">Coptic Scriptorium</a></em>, by Caroline T. Schroeder, Amir Zeldes, et al.</li>

  <li><em><a href="https://coptot.manuscriptroom.com/" target="_blank">Digital Edition of the Coptic Old Testament</a></em>, by the Göttingen Academy of Sciences and Humanities in Lower Saxony.</li>
</ul>
`;

/**
 * IMAGES credits the sites that the images on the lexicon pages are taken
 * from, ordered by how often we use them.
 *
 * NOTE: Whenever a new image source is added to
 * `dictionary/marcion_sourceforge_net/img_helper.py`, update this list
 * accordingly. Search engines only lead us to sources, and need no credit.
 *
 * TODO: (#0) Wikimedia Commons (CC BY / CC BY-SA), Flaticon, Freepik, the Noun
 * Project (CC BY 3.0), and Vecteezy all ask for per-image (or per-author)
 * attribution, not just a site-level credit. The image source URLs are
 * currently only recorded in the `alt` attribute. Surface them, along with
 * author names, either next to each image or in a generated credits list.
 */
const IMAGES = `
<ul>
  <li><a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>, images by their respective authors, used under their individual licenses (<a href="https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia" target="_blank" rel="noopener noreferrer">reuse policy</a>).</li>

  <li><a href="https://www.flaticon.com/" target="_blank" rel="noopener noreferrer">Flaticon</a>, icons by their respective authors, used under the <a href="https://www.flaticon.com/legal" target="_blank" rel="noopener noreferrer">Flaticon free license</a>.</li>

  <li><a href="https://thenounproject.com/" target="_blank" rel="noopener noreferrer">The Noun Project</a>, icons by their respective creators, used under <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>.</li>

  <li><a href="https://www.vecteezy.com/" target="_blank" rel="noopener noreferrer">Vecteezy</a>, images by their respective contributors, used under the <a href="https://www.vecteezy.com/licensing-agreement" target="_blank" rel="noopener noreferrer">Vecteezy free license</a>.</li>

  <li><a href="https://www.freepik.com/" target="_blank" rel="noopener noreferrer">Freepik</a>, images by their respective authors, used under the <a href="https://www.freepik.com/legal/terms-of-use" target="_blank" rel="noopener noreferrer">Freepik free license</a>.</li>

  <li><a href="https://uxwing.com/" target="_blank" rel="noopener noreferrer">UXWing</a>, icons used under the <a href="https://uxwing.com/license/" target="_blank" rel="noopener noreferrer">UXWing license</a>.</li>

  <li><a href="https://www.svgrepo.com/" target="_blank" rel="noopener noreferrer">SVG Repo</a>, icons used under their individual licenses (<a href="https://www.svgrepo.com/page/licensing/" target="_blank" rel="noopener noreferrer">licensing</a>).</li>
</ul>
`;

/**
 * CONTACT lists the ways to reach us.
 */
const CONTACT = `
<ul>
  <li>Email us at 📧 <a href="mailto:remnqymi@gmail.com">remnqymi@gmail.com</a>.</li>

  <li>File a <a href="https://github.com/pishoyg/coptic/issues/new" target="_blank" rel="noopener noreferrer">ticket</a> or a <a href="https://docs.google.com/forms/d/e/1FAIpQLSeNVAjxtJcAR7i6AwBI3SFlzRWC5DQ09G6LfbySbZGvZCdpIg/viewform?usp=pp_url&amp;entry.1382006920=http://remnqymi.com/" target="_blank" rel="noopener noreferrer">report</a>.</li>
</ul>

<p>Feedback is welcome.</p>
`;

/**
 * DONATE lists the causes that we encourage our users to support.
 */
const DONATE = `
<ul>
  <li>You can support <a href="http://coptic.wiki/" target="_blank" rel="noopener noreferrer">CopticWiki</a>, who provide Lexicon data, through:
    <ul>
      <li><a href="https://www.patreon.com/c/CopticWiki/posts" target="_blank" rel="noopener noreferrer">Patreon <img class="inline-logo" alt="Patreon" src="/img/logos/patreon.png"></a></li>

      <li><a href="https://buymeacoffee.com/copticwiki" target="_blank" rel="noopener noreferrer">Buy Me a Coffee <img class="inline-logo" alt="Buy Me a Coffee" src="/img/logos/buy-me-a-coffee.png"></a></li>

      <li><a href="https://ko-fi.com/copticwiki" target="_blank" rel="noopener noreferrer">Ko-fi <img class="inline-logo" alt="Ko-fi" src="/img/logos/ko-fi.png"></a></li>
    </ul>
  </li>

  <li>Please also consider donating to <a href="https://copticorphans.org/" target="_blank" rel="noopener noreferrer">Coptic Orphans <img class="inline-logo" alt="Coptic Orphans" src="/img/logos/coptic-orphans.png"></a></li>
</ul>
`;

/**
 * LICENSE states the licenses that our data and code are released under.
 */
const LICENSE = `
<ul>
  <li>Lexicon data is released under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer"><img class="inline-logo" alt="CC BY-SA 4.0" src="/img/logos/cc-by-sa.png"></a></li>

  <li><a href="https://github.com/pishoyg/coptic/" target="_blank" rel="noopener noreferrer">Code</a> is released under <a href="https://www.gnu.org/licenses/gpl-3.0.en.html#license-text" target="_blank" rel="noopener noreferrer">GPL-3.0.</a> <a href="https://www.gnu.org/licenses/gpl-3.0.en.html#license-text" target="_blank" rel="noopener noreferrer"><img class="inline-logo" alt="GPL-3.0" src="/img/logos/gplv3.png"></a></li>
</ul>
`;

/**
 * CODE states where our code lives.
 */
const CODE = `
<p>Code lives at <a href="https://github.com/pishoyg/coptic/" target="_blank" rel="noopener noreferrer">github.com/pishoyg/coptic <img class="inline-logo" alt="https://github.com" src="/img/logos/github.png"></a>.
We are in need of contributors. If this work interests you, please reach out.</p>
`;

/**
 * PANELS maps the ID of each panel's trigger to the panel's content.
 */
const PANELS: Record<ID, () => (Node | string)[]> = {
  [ID.CITED_WORKS]: () => [
    help.heading(TITLE.CREDITS),
    ...html.parse(CREDITS),
    document.createElement('hr'),
    help.heading(TITLE.WORKS),
    ...html.parse(WORKS),
    document.createElement('hr'),
    help.heading(TITLE.IMAGES),
    ...html.parse(IMAGES),
    document.createElement('hr'),
    help.heading(TITLE.LICENSE),
    ...html.parse(LICENSE),
  ],
  [ID.CONTACT]: () => [help.heading(TITLE.CONTACT), ...html.parse(CONTACT)],
  [ID.DONATE]: () => [help.heading(TITLE.DONATE), ...html.parse(DONATE)],
  [ID.CODE]: () => [help.heading(TITLE.CODE), ...html.parse(CODE)],
};

/**
 * Build a panel for each panel trigger present on the page. A page picks its
 * panels by carrying (or omitting) their triggers.
 */
export function init(): void {
  Object.values(ID).forEach((id: ID): void => {
    const trigger: HTMLElement | null = document.getElementById(id);
    if (trigger) {
      new help.Panel(trigger, ...PANELS[id]());
    }
  });
}
