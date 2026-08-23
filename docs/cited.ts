/** Package cited defines the panel listing the works cited on this site. */

import * as html from './html.js';
import * as help from './help.js';

const TITLE = 'Cited Works';

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

  <li>
    <em><a href="https://refubium.fu-berlin.de/handle/fub188/27813" target="_blank">Comprehensive Coptic Lexicon</a></em> (<a href="https://aaew.bbaw.de/tla/" target="_blank">BBAW/Thesaurus Linguae Aegyptiae project</a>, <a href="https://dioskoros.org/" target="_blank">FU Berlin/DDGLC project</a>), DOI <a href="https://doi.org/10.17169/refubium-27566" target="_blank">10.17169/refubium-27566</a>.
  </li>

  <li>
    <em><a href="https://coptic-dictionary.org/" target="_blank">Coptic Dictionary Online</a></em>, ed. by the <a href="https://kellia.uni-goettingen.de/" target="_blank">Koptische/Coptic Electronic Language and Literature International Alliance (KELLIA)</a>.
  </li>

  <li><em><span dir="rtl">قاموس قبطي عربي لكلمات اللهجة البحيرية والكلمات المأخوذة من اللغة اليونانية</span></em>, by <span dir="rtl">دير القديس أنبا مقار ببرية شيهيت</span> (the Monastery of St. Macarius the Great, Scetis).</li>

  <li><em>ⲡⲓⲁⲛⲥⲁϫⲓ ⲛ̀ϯⲁⲥⲡⲓ ⲛ̀ⲣⲉⲙⲛ̀ⲭⲏⲙⲓ | <span dir="rtl">قاموس اللغة القبطية للهجتين البحيرية والصعيدية</span></em>, by <span dir="rtl">معوض داود عبدالنور</span> (Moawad Dawoud Abd al-Nour).</li>

  <li><em><a href="https://copticscriptorium.org/" target="_blank">Coptic Scriptorium</a></em>, by Caroline T. Schroeder, Amir Zeldes, et al.</li>

  <li><em><a href="https://coptot.manuscriptroom.com/" target="_blank">Digital Edition of the Coptic Old Testament</a></em>, by the Göttingen Academy of Sciences and Humanities in Lower Saxony.</li>

  <li><em><a href="https://coptic.wiki/" target="_blank">CopticWiki</a></em>, by Randy Komforty.</li>

  <li><em><a href="http://www.stshenouda.org/coptic-Bible-app" target="_blank">Coptic Bible App</a></em>, by St. Shenouda the Archimandrite Coptic Society.</li>

  <li><em><a href="https://www.coptist.com/2025/07/30/digitised-bibliography-crum/" target="_blank">Digitised bibliography of Crum's "List of Abbreviations"</a></em>, The Coptist.</li>
</ul>
`;

/**
 * Build the Cited Works panel, toggled by the page's Cited Works button.
 */
export function init(): void {
  new help.Panel(TITLE, document.getElementById(ID.CITED_WORKS)!).append(
    ...html.parse(WORKS)
  );
}
