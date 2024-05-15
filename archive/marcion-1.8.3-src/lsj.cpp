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

#include "lsj.h"
#include "ui_lsj.h"

unsigned int CLSJ::count=0;

WDict CLSJ::wclass;
WDict CLSJ::wpers;
WDict CLSJ::wnum;
WDict CLSJ::wtens;
WDict CLSJ::wmode;
WDict CLSJ::wvoice;
WDict CLSJ::wgender;
WDict CLSJ::wcase;
WDict CLSJ::wadjform;
QList<WDict*> CLSJ::mclist;

QString CLSJ::gwcount("?");
QString CLSJ::lwcount("?");

QString const lat(QString::fromUtf8("abgdezhqiklmncoprstufxywABGDEZHQIKLMNCOPRSTUFXYW-,. "));
QString const gr(QString::fromUtf8("αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ-,. "));

unsigned short lat_acc[]={
    '(',')','/','$','\\','=','+','|','?','_','^','\'',0
};

unsigned short gr_acc[]={
    0x0314,
    0x0313,
    0x0301,
    0x0300,
    0x0300,
    0x0342,
    0x0308,
    0x0345,
    0x0323,
    0x0304,
    0x0306,
    0x02bc,
    0x0
};


CLSJ::CLSJ(CMessages * const messages,
           QWidget *parent) :
    QWidget(parent),
    ui(new Ui::CLSJ),
    messages(messages),
    _fulltextQuery(),
    _store()
{
    ui->setupUi(this);

    setWindowTitle(tr("Gk/Lat dictionary (")+QString::number(++count)+")");

    connect(&messages->settings(),SIGNAL(fontChanged(CTranslit::Script, QFont)),this,SLOT(settings_fontChanged(CTranslit::Script, QFont)));
    connect(ui->brOutput->browser(),SIGNAL(anchorClicked(QUrl)),this,SLOT(slot_AnchorClicked(QUrl)));
    connect(ui->txtInput,SIGNAL(textChanged(QString)),this,SLOT(slot_txtInput_textChanged(QString)));

    ui->brOutput->browser()->clear();

    ui->brOutput->disableDictionaries(true);
    ui->brOutput->allowChangeScript();
    ui->brOutput->init(windowTitle(),CBookTextBrowser::Greek);
    on_rbGreek_toggled(ui->rbGreek->isChecked());

    ui->brOutput->browser()->setPlainText(tr("\ngreek word count: ")+gwcount+tr("\nlatin word count: ")+lwcount);

    ui->spnLimit->setValue(m_sett()->queryResultsCount());
    ui->txtInput->activate();

    IC_SIZES
}

CLSJ::~CLSJ()
{
    RM_WND;
    delete ui;
}

void CLSJ::init()
{
    wclass << WDictItem('a',tr("adjective"))
           << WDictItem('d',tr("adverb"))
           << WDictItem('t',tr("participle"))
           << WDictItem('v',tr("verb"))
           << WDictItem('n',tr("noun"))
           << WDictItem('x',tr("irregular"))
           << WDictItem('r',tr("preposition"))
           << WDictItem('e',tr("interjection"))
           << WDictItem('c',tr("conjunction"))
           << WDictItem('g',tr("particle"))
           << WDictItem('p',tr("pronoun"))
           << WDictItem('m',tr("numeral"))
           << WDictItem('l',tr("article"))
           << WDictItem('f',"f")
           << WDictItem('-',QString());

    wpers << WDictItem('1',tr("1st pers"))
          << WDictItem('2',tr("2nd pers"))
          << WDictItem('3',tr("3rd pers"))
          << WDictItem('-',QString());

    wnum << WDictItem('s',tr("singular"))
         << WDictItem('p',tr("plural"))
         << WDictItem('d',tr("dual"))
         << WDictItem('-',QString());

    wtens <<   WDictItem('a',tr("aorist"))
          <<   WDictItem('p',tr("present"))
          <<   WDictItem('i',tr("imperfectum"))
          <<   WDictItem('f',tr("futurum"))
          <<   WDictItem('l',tr("plusquamperfectum"))
          <<   WDictItem('r',tr("perfectum"))
          <<   WDictItem('t',tr("perf futurum"))
          <<   WDictItem('-',QString());

    wmode <<  WDictItem('p',tr("participle"))
          <<  WDictItem('n',tr("infinitive"))
          <<  WDictItem('i',tr("indicative"))
          <<  WDictItem('s',tr("conjunctive"))
          <<  WDictItem('m',tr("imperative"))
          <<  WDictItem('o',tr("optative"))
          <<  WDictItem('g',tr("gerundive"))
          <<  WDictItem('u',tr("supinum"))
          <<  WDictItem('-',QString());

    wvoice << WDictItem('p',tr("passive"))
           << WDictItem('a',tr("active"))
           << WDictItem('m',tr("medium"))
           << WDictItem('e',tr("mediopassive"))
           << WDictItem('-',QString());

    wgender << WDictItem('f',tr("female"))
            << WDictItem('m',tr("male"))
            << WDictItem('n',tr("neuter"))
            << WDictItem('-',QString());

    wcase  << WDictItem('a',tr("accusative"))
           << WDictItem('n',tr("nominative"))
           << WDictItem('v',tr("vocative"))
           << WDictItem('d',tr("dative"))
           << WDictItem('g',tr("genitive"))
           << WDictItem('b',tr("ablative"))
           << WDictItem('-',QString());

    wadjform << WDictItem('c',tr("comparative"))
             << WDictItem('s',tr("superlative"))
             << WDictItem('-',QString());

    mclist << &wclass
           << &wpers
           << &wnum
           << &wtens
           << &wmode
           << &wvoice
           << &wgender
           << &wcase
           << &wadjform;

    QString query("select (select count(*) from `dict_lemmas` where `lemma_lang_id`=2),(select count(*) from `dict_lemmas` where `lemma_lang_id`=3)");
    MQUERY_GETFIRST(q,query)

    gwcount=q.value(0);
    lwcount=q.value(1);
}

//

void CLSJ::slot_txtInput_textChanged(QString const & text)
{
    bool const b=text.isEmpty();
    ui->btTabDict->setEnabled(!b);
    ui->btTabInfl->setEnabled(!b);
}

void CLSJ::on_brOutput_dictionaryRequested(int dict,QString const & word)
{
    switch(dict)
    {
    case CBookTextBrowser::LSJ :
    {
        ui->txtInput->setSwitchState(true);
        ui->twInput->setCurrentIndex(0);
        ui->rbExact->toggle();
        bool const is_gk=CTranslit::isGreek(word);
        if(is_gk)
        {
            ui->rbGreek->toggle();
            ui->txtInput->setText(CTranslit::tr(word,CTranslit::GreekNToGreekTr,true,CTranslit::TrimAndKeepOne));
        }
        else
        {
            ui->rbLatin->toggle();
            ui->txtInput->setText(CTranslit::tr(word,CTranslit::LatinNToLatinTr,true,CTranslit::TrimAndKeepOne));
        }
        break;
    }
    }
}

void CLSJ::slot_AnchorClicked(QUrl url)
{
    USE_CLEAN_WAIT

    ui->cmbResults->clear();

    QString const anchor("<a name=\"result\"></a>");
    QString s(url.toString());
    QString l("9");
    if(s.length()>0)
    {
        l=s.at(s.length()-1);
        s.chop(1);
    }
    else return;

    unsigned short const action=l.toUShort();

    for(int x=0;x<_store.items.count();x++)
    {
        if(QString::compare(_store.items[x].text,anchor)==0)
        {
            while(_store.items.count()!=x)
                _store.items.removeLast();
            _store.count=_store.items.count();
            break;
        }
    }

    switch(action)
    {
    case 1 :
    case 2 :
    {
        bool const gk=action==1;

        s=perseusToUtf8(s,gk);
        m_msg()->MsgMsg(tr("dictionary requested, word '")+s+tr("', language: ")+(gk?tr("Greek"):tr("Latin")));

        _store.appendItem(false,anchor);
        dictionary(s,Exact,gk);
        displayStore();
        ui->brOutput->browser()->scrollToAnchor("result");

        break;
    }
    case 3 :
    case 4 :
    {
        bool const gk=action==3;

        _store.appendItem(false,anchor);
        QString const query("select `morph_code`,`form` from `dict_parses` where `lemma_id`="+s+" order by `morph_code`");
        MQUERY(q,query)

        unsigned int const size=q.size();
        _store.appendItem(false,"<br>"+QString::number(size)+tr(" records")+QString("<br><table style=\"text-align: left; width: 100%;\" border=\"1\" cellpadding=\"5\" cellspacing=\"0\"><tbody>"));
        while(q.next())
        {
            _store.appendItem(false,"<tr><td><strong>");
            _store.appendItem(gk,perseusToUtf8(q.value(1),gk));
            _store.appendItem(false,"</strong></td><td>"+morphCode(q.value(0))+"</td></tr>");
        }

        _store.appendItem(false,QString("</tbody></table>"));

        break;
    }
    default:
        return;
        break;
    }

    displayStore();
    ui->brOutput->browser()->scrollToAnchor("result");
}

void CLSJ::on_btTabDict_clicked()
{
    bool gk=ui->rbGreek->isChecked();
    ui->brOutput->browser()->clear();
    ui->cmbResults->clear();

    _store.clear();

    dictionary(ui->txtInput->text_utf8(),searchMode(),gk);
    displayStore();
    ui->txtInput->updateHistory();
}

void CLSJ::on_btTabInfl_clicked()
{
    bool gk=ui->rbGreek->isChecked();
    ui->brOutput->browser()->clear();
    ui->cmbResults->clear();

    _store.clear();

    parse(gk);
    ui->txtInput->updateHistory();
}

QString CLSJ::prepareSenseItem(QString const & source)
{
    QRegExp rtag("(<foreign|<ref)");
    QString rv(source);

    int p,last;
    while((p=rtag.indexIn(rv))>-1)
    {
        last=rv.length();
        QString const s(rtag.cap());
        if(QString::compare(s,"<foreign")==0)
        {
            MDictTag ts("foreign",rv);
            if(!ts.isEmpty())
            {
                if(ts.hasKeyValue("lang","greek"))
                    rv.replace(ts.body(),perseusToUtf8(ts.content(),true));
                else
                    rv.replace(ts.body(),ts.content());
            }
        }
        else if(QString::compare(s,"<ref")==0)
        {
            MDictTag ts("ref",rv);
            if(!ts.isEmpty())
            {
                if(ts.hasKeyValue("lang","greek"))
                    rv.replace(ts.body(),perseusToUtf8(ts.content(),true));
                else
                    rv.replace(ts.body(),ts.content());
            }
        }

        if(last==rv.length())
            break;
    }

    return rv;
}

QString CLSJ::prepareSense(QString const & source,bool greek)
{
    QRegExp r("<\\!.*>");
    r.setMinimal(true);
    QString src(source),dest;
    src.remove(r);
    src.remove("\n");
    src=src.trimmed();

    src.replace("&amacr;","&#x101;");
    src.replace("&Amacr;","&#x100;");
    src.replace("&emacr;","&#x113;");
    src.replace("&Emacr;","&#x112;");
    src.replace("&imacr;","&#x12b;");
    src.replace("&Imacr;","&#x12a;");
    src.replace("&omacr;","&#x14d;");
    src.replace("&Omacr;","&#x14c;");
    src.replace("&umacr;","&#x16b;");
    src.replace("&Umacr;","&#x16a;");
    src.replace("&ymacr;","&#563;");
    src.replace("&Ymacr;","&#562;");

    src.replace("&breve;","&#x2d8;");
    src.replace("&Breve;","&#x2d8;");

    src.replace("&lt;","&#60;");
    src.replace("&gt;","&#62;");
    src.replace("&equals;","=");
    src.replace("&ast;","*");

    MDictTag::updateTag(src,"form");
    MDictTag::updateTag(src,"tr");
    MDictTag::updateTag(src,"xr");
    MDictTag::updateTag(src,"pos");
    MDictTag::updateTag(src,"trans","b");
    MDictTag::updateTag(src,"emph","u");
    MDictTag::updateTag(src,"usg","i");

    MDictTag t1("entry",src);
    src=t1.body();
    MDictTag t2("orth",src);
    QString orth=perseusToUtf8(t2.content(),greek);

    dest="<span style=\"color: darkblue;\">"+orth+"</span><br>";
    src.remove(t2.body());

    QRegExp rtg("(<gramGrp|<note|<etym|<sense)");
    int p,last;
    while((p=rtg.indexIn(src))>-1)
    {
        last=src.length();
        QString const s(rtg.cap());
        if(QString::compare(s,"<gramGrp")==0)
        {
            MDictTag ts("gramGrp",src);
            if(!ts.isEmpty())
            {
                QString s(ts.content());
                MDictTag::removeETag(s,"note");
                dest.append("<small>Gram: "+s.trimmed()+"</small><br>");
                src.remove(ts.body());
            }
        }
        else if(QString::compare(s,"<note")==0)
        {
            MDictTag ts("note",src);
            if(!ts.isEmpty())
            {
                QString s(ts.content());
                if(ts.hasKeyValue("lang","greek"))
                    s=perseusToUtf8(s,true);
                dest.append("<small>Note: "+prepareSenseItem(s)+"</small><br>");
                src.remove(ts.body());
            }
        }
        else if(QString::compare(s,"<etym")==0)
        {
            MDictTag ts("etym",src);
            if(!ts.isEmpty())
            {
                dest.append("Etym: "+prepareSenseItem(ts.content())+"<br>");
                src.remove(ts.body());
            }
        }
        else if(QString::compare(s,"<sense")==0)
        {
            MDictTag ts("sense",src);
            if(!ts.isEmpty())
            {
                QString s(prepareSenseItem(ts.content())+"<br>"),ps(ts.value("n"));
                if(!ps.startsWith("0"))
                    s.prepend(ps+". ");
                s.prepend(QString("&mdash;").repeated(ts.value("level").toInt()));
                dest.append(s);
                src.remove(ts.body());
            }
        }
        if(last==src.length())
            break;
    }

    dest.remove(QRegExp("<br>$"));
    dest.replace("@****","<");
    dest.replace("****@",">");
    return QString("<p>"+dest+"</p>");
}

/*QString CLSJ::enclosedBy(QString const & begin,
                       QString const & end,
                       QString const & text,
                       bool outer,
                       int * from)
{
    int p=text.indexOf(begin,*from);
    if(p!=-1)
    {
        int p2=text.indexOf(end,p+begin.length());
        if(p2!=-1)
        {
            if(from)
            {
                    *from=p2+1;
            }
            if(outer)
                return text.mid(p,(p2+end.length())-p);
            else
                return text.mid(p+begin.length(),p2-p-begin.length());
        }
    }
    if(from)
        *from=-1;
    return QString();
}*/

QString CLSJ::utf8ToPerseus(QString const & utf8,bool greek)
{
    if(!greek)
    {
        QString s(utf8);
        //s=s.toLower();

        s.replace(QChar(0x00e6),QString("ae"));
        s.replace(QChar(0x00c6),QString("ae"));
        s.replace(QChar(0x0153),QString("oe"));
        s.replace(QChar(0x0152),QString("oe"));
        s.replace("j","i");
        s.replace("J","i");

        return s;
    }

    static QString const ul_lat(QString::fromUtf8("abgdezhqiklmncoprsstufxyw"));
    static QString const ul_gr(QString::fromUtf8("αβγδεζηθικλμνξοπρσςτυφχψω"));

    QString r;

    for(int x=0;x<utf8.count();x++)
    {
        QChar ch(utf8.at(x));
        int p=ul_gr.indexOf(ch);
        if(p>-1)
            r.append(ul_lat.at(p));
        else r.append(ch);
    }

    return r;
}

QString CLSJ::perseusToUtf8(QString const & latin,bool greek)
{
    if(!greek)
        return latin;

    QString l(latin);

    QString ns;
    bool next_untr=false;

    for(int x=0;x<l.length();x++)
    {
        if(next_untr)
        {
            ns.append(l[x]);
            next_untr=false;
            continue;
        }

        if(l[x]=='#')
        {
            next_untr=true;
            continue;
        }

        if(QRegExp("\\d").exactMatch(l.mid(x,1)))
        {
            ns.append(" "+l[x]);
            continue;
        }

        if(l[x]=='*')
        {
            QRegExp r("\\w");
            int p=l.indexOf(r,x+1);
            if(p!=-1)
            {
                l.replace(x,1,l[p].toUpper());
                l.remove(p,1);
            }
        }

        int p=lat.indexOf(l[x]);
        if(p!=-1)
            ns.append(gr[p]);
        else
        {
            bool b=false;
            for(unsigned short * y=&lat_acc[0];*y!=0;y++)
                if(l[x]==*y)
                {
                    ns.append(gr_acc[y-lat_acc]);
                    b=true;
                    break;
                }
            if(!b)
                ns.append(latin[x]);
        }
    }
    QRegExp r(QString::fromUtf8("σ\\W"));
    ns.append(" ");
    int p;
    while((p=ns.indexOf(r))!=-1)
        ns.replace(p,1,QString::fromUtf8("ς"));
    ns.chop(1);
    return ns;
}

void CLSJ::dictionary(QString const & str,SearchMode mode,bool greek)
{
    USE_CLEAN_WAIT

    CMySql q;
    QString query("select `sense`,`word` from `dict_senses` where `lang`="+(greek?QString("1"):QString("2"))+" and ");

    QString where,pstr(utf8ToPerseus(str,greek));
    pstr.replace("'","\\'");
    switch(mode)
    {
        case Exact :
        {
            where="`word_utf8`='"+pstr+"'";
            break;
        }
        case RegExp :
        {
            where="`word_utf8` regexp '"+pstr+"'";
            break;
        }
    }

    query.append(where+limit());

    if(!_fulltextQuery.isEmpty())
    {
        query=_fulltextQuery;
        query.append(limit());
    }

    messages->MsgMsg(tr("executing query '")+query+"'");
    if(!q.exec(query))
    {
        messages->MsgErr(q.lastError());
        return;
    }

    QString size(QString::number(q.size()));
    _store.appendItem(false,QString("<br><a name=\"dictres\"></a>"+size+tr(" matches, input: ")));
    _store.appendItem(greek,str);
    _store.appendItem(false,QString(" / "+pstr+"<br>"));

    ui->cmbResults->addItem(tr("results: ")+size);

    int x=0;
    bool results(false);
    while(++x,q.next())
    {
        results=true;
        QString const x_s(QString::number(x));
        _store.appendItem(false,QString("<br><a name=\"entry"+x_s+tr("\"></a>match: ")+x_s+"/"+size+tr(" page: ")+QString::number(ui->spnPage->value())));

        QString const sense(prepareSense(q.value(0),greek)),
                      keyword(perseusToUtf8(q.value(1),greek));

        ui->cmbResults->addItem("["+x_s+"/"+size+"] "+keyword);

        _store.appendItem(false,"<table style=\"text-align: left; width: 100%;\" border=\"1\" cellpadding=\"5\" cellspacing=\"0\"><tbody><tr><td style=\"vertical-align: top; background-color: rgb(220, 220, 220);\">");
        _store.appendItem(false,QString(tr("keyword: <b>")));
        _store.appendItem(greek,keyword);
        _store.appendItem(false,QString("</b></td></tr><tr><td style=\"vertical-align: top;\">"+sense+"</td></tr></tbody></table><br>"));
    }

    if(!results)
        _store.appendItem(false,tr("no results<br>"));

    messages->MsgOk();
}

void CLSJ::parse(bool greek)
{
    USE_CLEAN_WAIT

    QString const cmpstr(ui->rbExact->isChecked()?QString("="):QString(" regexp "));
    QString const txt(ui->txtInput->text_utf8());
    QString const ptxt(utf8ToPerseus(txt,greek));
    QString query("select `morph_code`,`form`,`lemma_text`,`lemma_short_def`,`bare_headword`,`dict_parses`.`lemma_id` from `dict_parses` left join `dict_lemmas` on `dict_parses`.`lemma_id`=`dict_lemmas`.`lemma_id` where `lemma_lang_id`="+(greek?QString("2"):QString("3"))+" and  `bare_form`"+cmpstr+"'"+ptxt+"'"+limit());

    MQUERY(q,query)

    unsigned int const size=q.size();
    _store.appendItem(false,QString("<table style=\"text-align: left; width: 100%;\" border=\"1\" cellpadding=\"5\" cellspacing=\"0\"><tbody><tr><td>"+QString::number(size)+tr(" matches, input: ")));
    _store.appendItem(false,txt);
    _store.appendItem(false," / "+ptxt+"</td></tr><tr><td><ul>");

    bool results(false);
    while(q.next())
    {
        results=true;
        QString const morph_code(q.value(0));
        QString exp_form(q.value(1));
        QString lemma_text(
                perseusToUtf8(q.value(2),greek));
        QString def(q.value(3));

        _store.appendItem(false,"<li>");
        _store.appendItem(false,QString(morphCode(morph_code)+" | <u>"));
        _store.appendItem(greek,perseusToUtf8(exp_form,greek));
        _store.appendItem(false,"</u> | <strong>");
        _store.appendItem(greek,lemma_text);
        _store.appendItem(false,QString("</strong> | <a href=\""+q.value(4)+(greek?QString("1"):QString("2"))+"\">"+tr("meaning")+"</a>: <i>"+def+"</i> | <a href=\"")+q.value(5)+(greek?QString("3"):QString("4"))+tr("\">available forms</a></li>"));
    }

    if(!results)
        _store.appendItem(false,tr("no results"));
    _store.appendItem(false,"</ul></td></tr></tbody></table><br>");

    displayStore();
    messages->MsgOk();
}

CLSJ::SearchMode CLSJ::searchMode() const
{
    if(ui->rbExact->isChecked())
        return Exact;
    else if(ui->rbRegexp->isChecked())
        return RegExp;

    return Exact;
}

void CLSJ::displayStore()
{
    QString atxt;
    for(int x=0;x<_store.count;x++)
    {
        QString s(_store.items[x].text);

        if(_store.items[x].is_greek)
        {
            s=CTranslit::tr(s,CTranslit::GreekNToGreekTr,ui->brOutput->rmAccents(),ui->brOutput->rmSpaces2());
            s=CTranslit::tr(s,CTranslit::GreekTrToGreekN,ui->brOutput->rmAccents(),ui->brOutput->rmSpaces2());
            /*if(brOutput->isHighlightChecked())
                s=brOutput->highlightText(s);*/
        }
        atxt.append(s);
    }

    ui->brOutput->browser()->clear();
    ui->brOutput->browser()->insertHtml(atxt);
    ui->brOutput->finalizeContent();
    ui->brOutput->browser()->moveCursor(QTextCursor::Start);
}

void CLSJ::on_brOutput_contentChanged(bool, bool, bool * processed)
{
    displayStore();
    *processed=true;
}

void CLSJ::on_txtInput_query()
{
    on_btTabDict_clicked();
}

QString CLSJ::limit() const
{
    return QString(" limit ")+QString::number(
            (ui->spnPage->value()-1)*ui->spnLimit->value())+","+
            QString::number(ui->spnLimit->value());
}

void CLSJ::prepareParse(QString const & str,bool greek)
{
    if(greek)
        ui->rbGreek->toggle();
    else
        ui->rbLatin->toggle();

    _store.clear();
    ui->brOutput->browser()->clear();
    ui->cmbResults->clear();

    ui->rbExact->setChecked(true);
    ui->txtInput->setSwitchState(true);
    ui->txtInput->setText(str);
    ui->twInput->setCurrentIndex(0);
    ui->txtInput->updateHistory();
}

void CLSJ::directSearch(QString const & str)
{
    _store.clear();
    ui->brOutput->browser()->clear();
    ui->cmbResults->clear();

    ui->rbExact->setChecked(true);
    ui->txtInput->setSwitchState(true);
    ui->txtInput->setText(str);
    ui->twInput->setCurrentIndex(0);

    dictionary(ui->txtInput->text_utf8(),CLSJ::Exact,true);
    displayStore();
}

QString CLSJ::morphCode(QString const & mcode) const
{
    QStringList l;

    for(int x=0;x<mclist.count();x++)
    {
        QChar s(mcode.at(x));
        WDict * wd(mclist.at(x));
        for(int y=0;y<wd->count();y++)
            if(wd->at(y).first==s)
            {
                QString const mc(wd->at(y).second);
                if(!mc.isEmpty())
                    l.append(mc);
                break;
            }
    }
    return l.join(", ");
}

void CLSJ::on_rbGreek_toggled(bool checked)
{
    if(checked)
    {
        ui->txtInput->setScript(CTranslit::Greek,false);
        QFont const f(m_sett()->bFont(CTranslit::Greek));
        ui->brOutput->setFont(f);
        ui->cmbResults->setFont(f);
    }
    else
    {
        ui->txtInput->setScript(CTranslit::Latin,false);
        QFont const f(m_sett()->bFont(CTranslit::Latin));
        ui->brOutput->setFont(f);
        ui->cmbResults->setFont(f);
    }
    ui->txtInput->refreshFonts();
}

void CLSJ::on_rbLatin_toggled(bool checked)
{
    on_rbGreek_toggled(!checked);
}

void CLSJ::on_cmbResults_activated(int index)
{
    if(index>0)
        ui->brOutput->browser()->scrollToAnchor("entry"+QString::number(index));
    else if(index==0)
        ui->brOutput->browser()->scrollToAnchor("dictres");
}

/*void CLSJ::prepareDictionary()
{
    txtInput->setSwitchState(false);
    rbExact->setChecked(true);
}*/

void CLSJ::settings_fontChanged(CTranslit::Script uf, QFont f)
{
    ui->txtInput->refreshFonts();

    QString s;
    switch(uf)
    {
        case CTranslit::Greek :
        {
            if(ui->rbGreek->isChecked())
            {
                s=tr("Greek");
                ui->brOutput->setFont(f);
                ui->cmbResults->setFont(f);
            }
            break;
        }
        case CTranslit::Latin :
        {
            if(ui->rbLatin->isChecked())
            {
                s=tr("Latin");
                ui->brOutput->setFont(f);
                ui->cmbResults->setFont(f);
            }
            break;
        }
    default:
        return;
        break;
    }

    if(!s.isEmpty())
        messages->MsgMsg(windowTitle()+": "+s+tr(" font changed"));
}

void CLSJ::on_twInput_currentChanged(int index)
{
    if(index==0)
        slot_txtInput_textChanged(ui->txtInput->text());
    else
    {
        ui->btTabDict->setEnabled(false);
        ui->btTabInfl->setEnabled(false);
    }
}

void CLSJ::on_btFulltextSearch_clicked()
{
    CLatCopt::updateHistory(ui->cmbFulltext,true);

    bool const greek(ui->rbGreek->isChecked());
    QString pstr(ui->cmbFulltext->currentText().replace("'","\\'"));
    SearchMode const smode(ui->rbExact->isChecked()?Exact:RegExp);

    if(ui->rbEntTextPhrase->isChecked())
    {
        _fulltextQuery=QString("select `sense`,`word` from `dict_senses` where `lang`=<lang> and `sense` regexp '<sense>'");
        _fulltextQuery.replace(QString("<lang>"),greek?QString("1"):QString("2"));
        _fulltextQuery.replace(QString("<sense>"),pstr);
    }
    else
    {
        pstr=pstr.trimmed();
        if(pstr.contains(QString(" ")))
        {
            m_msg()->MsgWarn(tr("This option works with single words only. Remove spaces from text or use 'full text' instead."));
            return;
        }

        _fulltextQuery=QString("select distinct `dict_senses`.`sense`,`dict_senses`.`word` from `dict_senses` right join `dict_index` on `dict_senses`.`id`=`dict_index`.`sense_id` where `dict_senses`.`lang`=");

        _fulltextQuery.append(greek?QString("1"):QString("2"));
        _fulltextQuery.append(QString(" and `dict_index`.`word` "));
        _fulltextQuery.append(smode==Exact?QString("="):QString("regexp"));
        _fulltextQuery.append(QString(" '")+pstr+QString("'"));
        _fulltextQuery.append(QString(" and `dict_index`.`sense`="));
        _fulltextQuery.append(ui->rbSensesOnly->isChecked()?QString("true"):QString("false"));
    }

    _store.clear();
    ui->brOutput->browser()->clear();
    ui->cmbResults->clear();
    dictionary(pstr,smode,greek);
    displayStore();

    _fulltextQuery.clear();

    ui->brOutput->inputBox().setSwitchState(false);
    ui->brOutput->inputBox().setText(pstr);
    ui->brOutput->setPanelVisibility(true);
    ui->brOutput->highlightText(true);
}

void CLSJ::on_tbRegExpFt_clicked()
{
    MRegExpBuilder * rb= new MRegExpBuilder(ui->cmbFulltext->currentText(),ui->cmbFulltext,false);

    rb->setWindowFlags(Qt::Tool|Qt::Popup);
    rb->setWindowIcon(ui->tbRegExpFt->icon());
    rb->move(ui->tbRegExpFt->mapToGlobal(QPoint(0,0)));
    rb->show();
    rb->activateWindow();
}

void CLSJ::on_cmbFulltext_editTextChanged(const QString &arg1)
{
    ui->btFulltextSearch->setEnabled(!arg1.isEmpty());
}

//

CLSJStore::CLSJStore()
    :items(),count(0)
{
}

void CLSJStore::appendItem(bool is_greek,QString const & text)
{
    items.append(CLSJPiece(is_greek,text));
    count++;
}

void CLSJStore::clear()
{
    count=0;
    items.clear();
}

//

CLSJPiece::CLSJPiece()
    :is_greek(false),text()
{

}

CLSJPiece::CLSJPiece(bool is_greek,QString const & text)
    :is_greek(is_greek),text(text)
{

}

// MDictTag

MDictTag::MDictTag(QString const & name,QString const & source)
    :_name(name),_body(),_begin(),_end(),_content(),_attr(),_empty(true)
{
    QRegExp r("<"+name+".*</"+name+">"),r2("^<"+name+".*>"),r3("</"+name+">");
    r.setMinimal(true);
    r2.setMinimal(true);
    r3.setMinimal(true);

    int i=r.indexIn(source);
    if(i>-1)
    {
        _empty=false;
        _content=_body=r.cap();
        i=r2.indexIn(_body);
        if(i>-1)
        {
            _begin=r2.cap();
            _content.remove(r2);
        }
        i=r3.indexIn(_body);
        if(i>-1)
        {
            _end=r3.cap();
            _content.remove(r3);
        }
    }
    if(!_begin.isEmpty())
    {
        QStringList l(_begin.split(QString(" "),QString::SkipEmptyParts));
        if(l.count()>0)
        {
            l.removeAt(0);
            if(l.count()>0)
            {
                QRegExp r("^.+="),r2("^.*\""),r3("\".*$");
                r.setMinimal(true);
                r2.setMinimal(true);
                r3.setMinimal(true);
                for(int x=0;x<l.count();x++)
                {
                    QString a=l.at(x);
                    int i=r.indexIn(a);
                    {
                        if(i>-1)
                        {
                            MDictAttr da;
                            da._key=r.cap();
                            da._key.chop(1);
                            a.remove(r);
                            a.remove(r2);
                            a.remove(r3);
                            da._value=a;
                            _attr.append(da);
                        }
                    }
                }
            }
        }
    }
}

QString MDictTag::value(QString const & key)
{
    for(int x=0;x<_attr.count();x++)
    {
        if(QString::compare(_attr.at(x)._key,key)==0)
            return _attr.at(x)._value;
    }
    return QString();
}

bool MDictTag::hasKeyValue(QString const & key,QString const & value) const
{
    for(int x=0;x<_attr.count();x++)
        if(QString::compare(_attr.at(x)._key,key)==0)
            return QString::compare(_attr.at(x)._value,value)==0;
    return false;
}

void MDictTag::updateTag(QString & source,QString const & tag,QString const & replace_by)
{
    QString t1("<"+tag+">"),t2("</"+tag+">");
    if(!replace_by.isEmpty())
    {
        source.replace(t1,"@****"+replace_by+"****@");
        source.replace(t2,"@****/"+replace_by+"****@");
    }
    else
    {
        source.remove(t1);
        source.remove(t2);
    }
}

void MDictTag::removeETag(QString & source,QString const & tag)
{
    QRegExp r("<"+tag+".*</"+tag+">");
    r.setMinimal(true);
    source.remove(r);
}
