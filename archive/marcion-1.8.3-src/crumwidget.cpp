/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "ui_crumwidget.h"
#include "crumwidget.h"

#define LETTERS_COUNT 267

struct letter_struct {
                char letter[6];
                short int page;
        }letters[]={ // 31
        {"a",1},{"b",27},{"g",48},{"d",49},{"e",49},{"z",65},{"h",66},{"q",68},{"i",70},{"k",90},{"l",134},{"m",152},{"n",214},{"j",253},{"o",253},{"p",258},{"r",287},{"s",313},{"t",389},{"u",467},{"f",514},{"x",516},{"c",517},{"w",517},{"S",540},{"F",619},{"Q",628},{"K",629},{"H",631},{"J",745},{"G",801},

                {"ab",2},{"al",3},{"am",7},{"an",10},{"ap",13},{"ar",14},{"as",17},{"at",18},{"au",19},{"ax",21},{"aS",22},{"aK",23},{"aH",24},{"aJ",25},{"aG",26},
                // - 15
                {"bb",28},{"bk",29},{"bl",31},{"bm",39},{"bn",39},{"br",41},{"bs",44},{"bt",45},{"bS",46},{"bH",47},{"bG",48},
                // - 11
                {"eb",52},{"el",54},{"em",55},{"en",56},{"er",57},{"es",60},{"et",61},{"eu",62},{"ef",63},{"eS",63},{"eF",64},{"eH",64},
                // - 12
                {"il",76},{"im",77},{"in",78},{"ip",81},{"ir",82},{"is",85},{"it",86},{"iS",88},{"iH",89},
                // - 9
                {"kb",98},{"kk",100},{"kl",102},{"km",108},{"kn",111},{"kp",113},{"kr",114},{"ks",119},{"kt",122},{"ku",129},{"kS",130},{"kH",131},
                // - 12
                {"lb",136},{"lk",138},{"lj",140},{"ll",140},{"lm",142},{"ln",143},{"ls",144},{"lu",145},{"lF",148},{"lK",149},{"lH",149},{"lJ",150},{"lG",151},
                // - 13
                {"mk",161},{"ml",165},{"mm",166},{"mn",169},{"mp",177},{"mr",180},{"ms",184},{"mt",187},{"mu",196},{"mS",201},{"mH",208},{"mJ",212},
                // - 12
                {"nb",221},{"nk",222},{"nm",225},{"nn",226},{"ns",228},{"nt",229},{"nu",233},{"nf",236},{"nS",236},{"nF",238},{"nH",240},{"nJ",246},{"nG",250},
                // - 13
                {"om",254},{"on",255},{"os",256},{"oH",257},
                // - 4
                {"pk",261},{"pl",261},{"pm",263},{"pn",263},{"pp",266},{"pr",267},{"ps",273},{"pt",273},{"pS",277},{"pH",280},{"pG",285},
                // - 11
                {"rk",291},{"rm",294},{"rn",297},{"rp",298},{"rr",299},{"rs",299},{"rt",302},{"ru",306},{"rx",308},{"rS",308},{"rH",310},{"rG",312},
                // - 12
                {"sb",318},{"sk",324},{"sl",330},{"sm",334},{"sn",342},{"sp",349},{"sr",353},{"st",358},{"su",367},{"sS",374},{"sF",378},{"sH",379},{"sJ",387},{"sG",388},
                // - 14
                {"tb",397},{"tk",402},{"tl",408},{"tm",412},{"tn",417},{"tp",422},{"tr",423},{"ts",433},{"tt",437},{"tu",439},{"tS",449},{"tH",453},{"tJ",462},{"tG",464},
                // - 14
                {"ub",476},{"uk",476},{"ul",477},{"um",478},{"un",480},{"up",487},{"ur",488},{"us",492},{"ut",493},{"uS",499},{"uH",505},{"uJ",511},{"uG",512},
                // - 13
                {"wb",518},{"wk",519},{"wl",522},{"wm",523},{"wn",524},{"wp",526},{"wr",528},{"ws",530},{"wt",531},{"wS",533},{"wF",535},{"wH",536},{"wJ",539},
                // - 13
                {"Sb",550},{"Sq",555},{"Sk",555},{"Sl",557},{"Sm",563},{"Sn",568},{"Sp",574},{"Sr",582},{"Ss",589},{"St",590},{"Su",599},{"SS",604},{"SF",609},{"SJ",612},{"SG",618},
                // - 15
                {"Fn",623},{"Fr",624},{"Ft",624},{"FG",625},
                // - 4
                {"Hb",652},{"Hk",660},{"Hl",664},{"Hm",673},{"Hn",683},{"Hp",693},{"Hr",696},{"Hs",709},{"Ht",713},{"Hu",728},{"HF",740},{"HH",741},{"HJ",742},{"HG",744},
                // - 14
                {"Jb",759},{"Jk",760},{"Jl",765},{"Jm",770},{"Jn",772},{"Jp",777},{"Jr",780},{"Js",787},{"Jt",790},{"Ju",792},{"JF",796},{"JH",796},{"JJ",798},{"JG",800},
                // - 14
                {"Gb",804},{"Gl",806},{"Gm",815},{"Gn",819},{"Gp",824},{"Gr",827},{"Gt",832},{"Gu",835},{"GS",836},{"GJ",839},{"GG",843}
                // - 11


};

CCrumWidget::CCrumWidget(CMessages const * messages, QWidget *parent) :
        QWidget(parent),
        ui(new(Ui::CCrumWidget)),
        messages(messages)
#ifndef NO_DJVIEW
        ,context("djview"),
        djView(QDir::toNativeSeparators("data/djvu/Crum.djvu"),context)
#endif
{
    ui->setupUi(this);

#ifndef NO_DJVIEW
        ui->btRefresh->setVisible(false);
#endif

#ifndef NO_DJVIEW
        djView.showToolBar(false);
        layout()->addWidget(&djView);
#else
        //tabCrum->layout()->addWidget(&crumview);
#endif

        QFont cf(messages->settings().copticFont());
        cf.setPointSize(messages->settings().copticFontSize());
        ui->cmbLetter->setFont(cf);

        InitCrum();

        IC_SIZES
}
CCrumWidget::~CCrumWidget()
{
    RM_WND;
    delete ui;
}

void CCrumWidget::InitCrum()
{
    for(int x=0;x<LETTERS_COUNT;x++)
                ui->cmbLetter->addItem(CTranslit::to(letters[x].letter,
                CTranslit::Copt),(int)letters[x].page);

        for(int x=0;x<=19;x++)
        {
                ui->cmbPages->addItem("p "+QString::number(x));
        }
        for(int x=CRUM_FIRST;x<=CRUM_LAST;x++)
        {
                int num=(x-CRUM_FIRST)+1;
                ui->cmbPages->addItem(QString::number(num));
        }
        for(int x=0;x<=108;x++)
        {
                ui->cmbPages->addItem("i "+QString::number(x));
        }

#ifndef NO_DJVIEW
        ui->cmbStretch->addItem("FitWidth", QDjVuWidget::ZOOM_FITWIDTH);
  ui->cmbStretch->addItem("FitPage", QDjVuWidget::ZOOM_FITPAGE);
  ui->cmbStretch->addItem("Stretch", QDjVuWidget::ZOOM_STRETCH);
  ui->cmbStretch->addItem("1:1", QDjVuWidget::ZOOM_ONE2ONE);
  ui->cmbStretch->addItem("700%", 700);
  ui->cmbStretch->addItem("600%", 600);
  ui->cmbStretch->addItem("500%", 500);
  ui->cmbStretch->addItem("400%", 400);
  ui->cmbStretch->addItem("300%", 300);
  ui->cmbStretch->addItem("200%", 200);
  ui->cmbStretch->addItem("150%", 150);
  ui->cmbStretch->addItem("100%", 100);
#else
  ui->cmbStretch->addItem("Fit Width", 0);
  ui->cmbStretch->addItem("200%", 200);
  ui->cmbStretch->addItem("180%", 180);
  ui->cmbStretch->addItem("160%", 160);
  ui->cmbStretch->addItem("140%", 140);
  ui->cmbStretch->addItem("120%", 120);
  ui->cmbStretch->addItem("100%", 100);
#endif

}
void CCrumWidget::on_btMoveNext_pressed()
{
        ui->cmbPages->setCurrentIndex(ui->cmbPages->currentIndex()+1);
}

void CCrumWidget::on_btMovePrev_pressed()
{
        ui->cmbPages->setCurrentIndex(ui->cmbPages->currentIndex()-1);
}
void CCrumWidget::on_cmbLetter_currentIndexChanged(int index)
{
        ui->cmbPages->setCurrentIndex(ui->cmbLetter->itemData(index).toInt()-3+CRUM_FIRST);
}
void CCrumWidget::on_cmbStretch_currentIndexChanged(int index )
{
#ifndef NO_DJVIEW
        djView.getDjVuWidget()->setZoom(ui->cmbStretch->itemData(index).toInt());
#else
        int i=ui->cmbPages->currentIndex();
        if(i!=-1)
            on_cmbPages_currentIndexChanged(i);
#endif
}
void CCrumWidget::on_cmbLetter_editTextChanged(QString str)
{
    if(str.length()>=2)
    {
        QString s(CTranslit::to(str.trimmed(),CTranslit::Copt,true));
        int item=ui->cmbLetter->findText(s);
        if(item!=-1)
            ui->cmbLetter->setCurrentIndex(item);
    }
}
void CCrumWidget::on_cmbPages_currentIndexChanged(int index)
{
#ifndef NO_DJVIEW
    djView.goToPage(index);
#else
    int i=ui->cmbStretch->currentIndex();
    if(index!=-1&&i!=-1)
        crumview.loadPage(QDir::toNativeSeparators("data/crum_pages/page"+QString::number(index+1)+".tiff"),ui->cmbStretch->itemData(i).toInt());
#endif
}

void CCrumWidget::showPage(int page)
{
    ui->cmbPages->setCurrentIndex(page);
    /*cmbPages->lineEdit()->setText(QString::number(page));
    on_cmbPages_currentIndexChanged(page);*/
}
