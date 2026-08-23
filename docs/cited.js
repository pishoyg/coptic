"use strict";import*as e from"./html.js";import*as a from"./help.js";const i="Cited Works";var r=(t=>(t.CITED_WORKS="cited-works",t))(r||{});const o=`
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
    <em>\u2CA1\u2C93\u2C81\u2C9B\u2CA5\u2C81\u03EB\u2C93 \u2C9B\u0300\u03EF\u2C81\u2CA5\u2CA1\u2C93 \u2C9B\u0300\u2CA3\u2C89\u2C99\u2C9B\u0300\u2CAD\u2C8F\u2C99\u2C93 | <span dir="rtl">\u0642\u0627\u0645\u0648\u0633 \u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0642\u0628\u0637\u064A\u0629</span></em>, <span dir="rtl">\u0645\u0639\u0648\u0636 \u062F\u0627\u0648\u062F \u0639\u0628\u062F\u0627\u0644\u0646\u0648\u0631</span>, <a href="https://copticocc.org/" target="_blank">The Coptic Orthodox Cultural Center</a>.
  </li>

  <li>
    <em><span dir="rtl">\u0642\u0627\u0645\u0648\u0633 \u0642\u0628\u0637\u064A \u0639\u0631\u0628\u064A \u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0628\u062D\u064A\u0631\u064A\u0629</span></em>, <span dir="rtl">\u062F\u064A\u0631 \u0627\u0644\u0642\u062F\u064A\u0633 \u0623\u0646\u0628\u0627 \u0645\u0642\u0627\u0631 \u0628\u0628\u0631\u064A\u0629 \u0634\u064A\u0647\u064A\u062A</span> (<a href="https://stmacariusmonastery.org/?lang=en" target="_blank">Monastery of Saint Macarius the Great</a>).
  </li>

  <li><em><a href="http://www.stshenouda.org/coptic-Bible-app" target="_blank">Coptic Bible App</a></em>, by St. Shenouda the Archimandrite Coptic Society.</li>

  <li><em><a href="https://copticscriptorium.org/" target="_blank">Coptic Scriptorium</a></em>, by Caroline T. Schroeder, Amir Zeldes, et al.</li>

  <li><em><a href="https://coptot.manuscriptroom.com/" target="_blank">Digital Edition of the Coptic Old Testament</a></em>, by the G\xF6ttingen Academy of Sciences and Humanities in Lower Saxony.</li>
</ul>
`;export function init(){new a.Panel(i,document.getElementById("cited-works")).append(...e.parse(o))}
//# sourceMappingURL=cited.js.map
