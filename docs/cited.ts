/** Package cited defines the panel listing the works cited on this site. */

import * as html from './html.js';
import * as help from './help.js';

enum TITLE {
  WORKS = 'Cited Works',
  IMAGES = 'Image Credits',
}

enum ID {
  CITED_WORKS = 'cited-works',
}

/**
 * WORKS is the list of works that our data is derived from.
 *
 * NOTE: This markup duplicates the "Cited Works" section of `docs/index.html`.
 * The two are kept in sync manually, so any change here must be mirrored there
 * (and vice versa). The duplication is deliberate: the homepage is a static
 * page that loads no scripts, while this panel is built at runtime on pages
 * that have no such section.
 *
 * TODO: (#0) The anchors below open in a new tab without carrying
 * `rel="noopener noreferrer"`, unlike the anchors built by `html.anchor`. Add
 * the attribute, here and in `docs/index.html`.
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
 * Build the Cited Works panel, toggled by the page's Cited Works button.
 */
export function init(): void {
  new help.Panel(
    document.getElementById(ID.CITED_WORKS)!,
    help.heading(TITLE.WORKS),
    ...html.parse(WORKS),
    help.heading(TITLE.IMAGES),
    ...html.parse(IMAGES)
  );
}
