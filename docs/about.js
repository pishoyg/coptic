"use strict";import*as t from"./html.js";import*as e from"./help.js";var l=(r=>(r.CREDITS="Credits",r.WORKS="Cited Works",r.IMAGES="Image Credits",r.LICENSE="License",r.CONTACT="Contact",r.DONATE="Donate",r.CODE="Code",r))(l||{}),n=(o=>(o.CITED_WORKS="cited-works",o.CONTACT="contact",o.DONATE="donate",o.CODE="code",o))(n||{});const s=`
<p>This work is made possible through the dedication of:</p>

<ol>
  <li>Milan Konvicka, creator of <a href="https://marcion.sourceforge.net/" target="_blank">Marcion</a>.</li>

  <li>Randy Komforty, creator of <a href="https://coptic.wiki/" target="_blank">CopticWiki</a>.</li>

  <li>Dr. Hany Takla, founder of <a href="http://stshenouda.org" target="_blank">St. Shenouda the Archimandrite Coptic Society</a>.</li>
</ol>
`,c=`
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
`,p=`
<ul>
  <li><a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>, images by their respective authors, used under their individual licenses (<a href="https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia" target="_blank" rel="noopener noreferrer">reuse policy</a>).</li>

  <li><a href="https://www.flaticon.com/" target="_blank" rel="noopener noreferrer">Flaticon</a>, icons by their respective authors, used under the <a href="https://www.flaticon.com/legal" target="_blank" rel="noopener noreferrer">Flaticon free license</a>.</li>

  <li><a href="https://thenounproject.com/" target="_blank" rel="noopener noreferrer">The Noun Project</a>, icons by their respective creators, used under <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>.</li>

  <li><a href="https://www.vecteezy.com/" target="_blank" rel="noopener noreferrer">Vecteezy</a>, images by their respective contributors, used under the <a href="https://www.vecteezy.com/licensing-agreement" target="_blank" rel="noopener noreferrer">Vecteezy free license</a>.</li>

  <li><a href="https://www.freepik.com/" target="_blank" rel="noopener noreferrer">Freepik</a>, images by their respective authors, used under the <a href="https://www.freepik.com/legal/terms-of-use" target="_blank" rel="noopener noreferrer">Freepik free license</a>.</li>

  <li><a href="https://uxwing.com/" target="_blank" rel="noopener noreferrer">UXWing</a>, icons used under the <a href="https://uxwing.com/license/" target="_blank" rel="noopener noreferrer">UXWing license</a>.</li>

  <li><a href="https://www.svgrepo.com/" target="_blank" rel="noopener noreferrer">SVG Repo</a>, icons used under their individual licenses (<a href="https://www.svgrepo.com/page/licensing/" target="_blank" rel="noopener noreferrer">licensing</a>).</li>
</ul>
`,h=`
<ul>
  <li>Email us at \u{1F4E7} <a href="mailto:remnqymi@gmail.com">remnqymi@gmail.com</a>.</li>

  <li>File a <a href="https://github.com/pishoyg/coptic/issues/new" target="_blank" rel="noopener noreferrer">ticket</a> or a <a href="https://docs.google.com/forms/d/e/1FAIpQLSeNVAjxtJcAR7i6AwBI3SFlzRWC5DQ09G6LfbySbZGvZCdpIg/viewform?usp=pp_url&amp;entry.1382006920=http://remnqymi.com/" target="_blank" rel="noopener noreferrer">report</a>.</li>
</ul>

<p>Feedback is welcome.</p>
`,g=`
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
`,m=`
<ul>
  <li>Lexicon data is released under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer"><img class="inline-logo" alt="CC BY-SA 4.0" src="/img/logos/cc-by-sa.png"></a></li>

  <li><a href="https://github.com/pishoyg/coptic/" target="_blank" rel="noopener noreferrer">Code</a> is released under <a href="https://www.gnu.org/licenses/gpl-3.0.en.html#license-text" target="_blank" rel="noopener noreferrer">GPL-3.0.</a> <a href="https://www.gnu.org/licenses/gpl-3.0.en.html#license-text" target="_blank" rel="noopener noreferrer"><img class="inline-logo" alt="GPL-3.0" src="/img/logos/gplv3.png"></a></li>
</ul>
`,f=`
<p>Code lives at <a href="https://github.com/pishoyg/coptic/" target="_blank" rel="noopener noreferrer">github.com/pishoyg/coptic <img class="inline-logo" alt="https://github.com" src="/img/logos/github.png"></a>.
We are in need of contributors. If this work interests you, please reach out.</p>
`,u={"cited-works":()=>[e.heading("Credits"),...t.parse(s),document.createElement("hr"),e.heading("Cited Works"),...t.parse(c),document.createElement("hr"),e.heading("Image Credits"),...t.parse(p),document.createElement("hr"),e.heading("License"),...t.parse(m)],contact:()=>[e.heading("Contact"),...t.parse(h)],donate:()=>[e.heading("Donate"),...t.parse(g)],code:()=>[e.heading("Code"),...t.parse(f)]};export function init(){Object.values(n).forEach(i=>{const a=document.getElementById(i);a&&new e.Panel(a,...u[i]())})}
//# sourceMappingURL=about.js.map
