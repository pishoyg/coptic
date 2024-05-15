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

#include "cwordtemplate.h"
//
QString const CWordTemplate::c_html=QString("<table (*tableprop*)><tbody><tr><td style=\"vertical-align: top;\">(*type*)</td><td style=\"vertical-align: top;\"><a href=\"(*crumlink*)?num=(*crumlinkapp*)\">(*crum*)</a></td></tr><tr><td style=\"vertical-align: top;\" colspan=\"2\">(*word*)</td></tr><tr><td style=\"vertical-align: top;\" colspan=\"2\">(*english*)</td></tr></tbody></table>");

QString const CWordTemplate::c_header=QString("<table style=\"border-color: rgb(127,127,127);\" width=\"100%\" border=\"(*border*)\" cellpadding=\"(*padding*)\" cellspacing=\"(*spacing*)\"><tbody><tr style=\"background-color: rgb(230,230,230);\"><td>(*type*)</td><td colspan=\"2\"><a href=\"crum(*crum*)\">(*crum*)</a></td></tr>mcczechbegin<tr><td colspan=\"3\">(*czech*)</td></tr>mcczechend<tr><td colspan=\"3\">(*english*)</td></tr>mceditcopticbegin<tr><td colspan=\"3\">(*greek*)</td></tr><tr><td colspan=\"2\">created by (*crby*) at (*crat*)</td><td>updated by (*updby*) at (*updat*)</td></tr><tr><td colspan=\"2\"><a href=\"edit(*table*)(*key*)\">EDIT</a></td><td><a href=\"full(*wordkey*)\">SHOW FULL</a></td></tr>mceditcopticend</tbody></table>");

QString const CWordTemplate::c_editderiv=QString("<table style=\"border-color: rgb(127,127,127);\" width=\"100%\" border=\"(*border*)\" cellpadding=\"(*padding*)\" cellspacing=\"(*spacing*)\"><tbody><tr style=\"background-color: rgb(230,230,230);\"><td>(*type*)</td><td colspan=\"2\"><a href=\"crum(*crum*)\">(*crum*)</a>mtreebegin | <a href=\"tree(*treelink*)\">tree</a>mtreeend</td></tr><tr><td colspan=\"3\">(*word*)</td></tr>mcczechbegin<tr><td colspan=\"3\">(*czech*)</td></tr>mcczechend<tr><td colspan=\"3\">(*english*)</td></tr>mceditcopticbegin<tr><td colspan=\"3\">(*greek*)</td></tr><tr><td colspan=\"2\">created by (*crby*) at (*crat*)</td><td>updated by (*updby*) at (*updat*)</td></tr><tr><td colspan=\"2\"><a href=\"edit(*table*)(*key*)\">EDIT</a></td><td><a href=\"full(*wordkey*)\">SHOW FULL</a></td></tr>mceditcopticend</tbody></table>");

QString const CWordTemplate::c_editword=QString("<table style=\"border-color: rgb(127,127,127);\" width=\"100%\" border=\"(*border*)\" cellpadding=\"(*padding*)\" cellspacing=\"(*spacing*)\"><tbody><tr style=\"background-color: rgb(230,230,230);\"><td>(*type*)</td><td><a href=\"crum(*crum*)\">(*crum*)</a>mtreebegin | <a href=\"tree(*treelink*)\">tree</a>mtreeend</td><td><a href=\"full(*wordkey*)\">subitems</a>: (*dercount*)</td><td>(*quality*)</td></tr><tr><td colspan=\"4\">(*word*)</td></tr>mcczechbegin<tr><td colspan=\"4\">(*czech*)</td></tr>mcczechend<tr><td colspan=\"4\">(*english*)</td></tr>mceditcopticbegin<tr><td colspan=\"4\">(*greek*)</td></tr><tr><td colspan=\"2\">created by (*crby*) at (*crat*)</td><td colspan=\"2\">updated by (*updby*) at (*updat*)</td></tr><tr><td><a href=\"edit(*table*)(*key*)\">EDIT</a></td><td><a href=\"addd(*table*)(*key*)\">INSERT DERIVATION</a></td><td><a href=\"full(*wordkey*)\">SHOW FULL</a></td></tr>mceditcopticend</tbody></table>");

CWordTemplate::CWordTemplate( bool coptic_edit, bool show_czech, QString border,
                              QString padding,
                              QString spacing )
    :header(),
    editderiv(),
    editword(),
    coptic_edit(coptic_edit),
    show_czech(show_czech),
    border(border),
    padding(padding),
    spacing(spacing)
{
    //init();
}

CWordTemplate & CWordTemplate::operator=(CWordTemplate const & other)
{
    header.clear();
    editderiv.clear();
    editword.clear();
    coptic_edit=other.coptic_edit;
    show_czech=other.show_czech;
    border=other.border;
    padding=other.padding;
    spacing=other.spacing;
    key=other.key;
    type=other.type;
    crum=other.crum;
    quality=other.quality;
    word=other.word;
    czech=other.czech;
    english=other.english;
    greek=other.greek;
    wordkey=other.wordkey;
    table=other.table;
    derivcount=other.derivcount;
    crby=other.crby;
    crat=other.crat;
    updby=other.updby;
    updat=other.updat;
    treelink=other.treelink;

    return *this;
}

CWordTemplate::CWordTemplate(CWordTemplate const & other)
    :header(),
    editderiv(),
    editword(),
    coptic_edit(other.coptic_edit),
    show_czech(other.show_czech),
    border(other.border),
    padding(other.padding),
    spacing(other.spacing),
    key(other.key),
    type(other.type),
    crum(other.crum),
    quality(other.quality),
    word(other.word),
    czech(other.czech),
    english(other.english),
    greek(other.greek),
    wordkey(other.wordkey),
    table(other.table),
    derivcount(other.derivcount),
    crby(other.crby),
    crat(other.crat),
    updby(other.updby),
    updat(other.updat),
      treelink(other.treelink)
{
    //init();
}

void CWordTemplate::init(bool with_treelink)
{
    header=c_header;
    editderiv=c_editderiv;
    editword=c_editword;

    if(coptic_edit)
    {
        editderiv.remove("mceditcopticbegin").remove("mceditcopticend");
        editword.remove("mceditcopticbegin").remove("mceditcopticend");
        header.remove("mceditcopticbegin").remove("mceditcopticend");
    }
    else
    {
        editderiv.remove(QRegExp("mceditcopticbegin.*mceditcopticend"));
        editword.remove(QRegExp("mceditcopticbegin.*mceditcopticend"));
        header.remove(QRegExp("mceditcopticbegin.*mceditcopticend"));
    }
    if(show_czech)
    {
        editword.remove("mcczechbegin").remove("mcczechend");
        editderiv.remove("mcczechbegin").remove("mcczechend");
        header.remove("mcczechbegin").remove("mcczechend");
    }
    else
    {
        editderiv.remove(QRegExp("mcczechbegin.*mcczechend"));
        editword.remove(QRegExp("mcczechbegin.*mcczechend"));
        header.remove(QRegExp("mcczechbegin.*mcczechend"));
    }

    if(with_treelink)
    {
        editword.remove("mtreebegin").remove("mtreeend");
        editderiv.remove("mtreebegin").remove("mtreeend");
        header.remove("mtreebegin").remove("mtreeend");
    }
    else
    {
        editderiv.remove(QRegExp("mtreebegin.*mtreeend"));
        editword.remove(QRegExp("mtreebegin.*mtreeend"));
        header.remove(QRegExp("mtreebegin.*mtreeend"));
    }

    editword.replace("(*border*)",border);
    editderiv.replace("(*border*)",border);
    header.replace("(*border*)",border);
    editword.replace("(*padding*)",padding);
    editderiv.replace("(*padding*)",padding);
    header.replace("(*padding*)",padding);
    editword.replace("(*spacing*)",spacing);
    editderiv.replace("(*spacing*)",spacing);
    header.replace("(*spacing*)",spacing);
}

//
void CWordTemplate::setType(short int Type)
{
        type=CTranslit::getWordType(Type);
}
void CWordTemplate::setCrum(QString const & Crum,QString const & TreeLink)
{
    if(!Crum.startsWith("0"))
        crum=Crum;
    else
        crum=QString();
    treelink=TreeLink;
}
void CWordTemplate::setQuality(short int Quality)
{
	quality=QString(get_quality(Quality));
}
void CWordTemplate::setWord(QString const & Word)
{
    //Word.replace("$^$^",QString(0x27E8)).replace("^$^$",QString(0x27E9));
    word=formatw(
                CTranslit::to(Word,CTranslit::Copt));
}
void CWordTemplate::setCzech(QString const & Czech)
{
	czech=Czech;
}
void CWordTemplate::setEnglish(QString const & English)
{
	english=English;
}
void CWordTemplate::setGreek(QString const & Greek)
{
    greek=CTranslit::tr(Greek,CTranslit::GreekTrToGreekNcs,false,CTranslit::RemoveNone);
}
void CWordTemplate::setKey(int Key)
{
	key=QString::number(Key);
}
void CWordTemplate::setKey(QString const & Key)
{
	key=Key;
}
void CWordTemplate::setTable(QString const & Table)
{
	table=Table;
}
void CWordTemplate::setDerivCount(QString const & DerCount)
{
        derivcount=DerCount;
}

void CWordTemplate::setCreatedBy(QString const & CrBy)
{
    crby=CrBy;
}

void CWordTemplate::setCreatedAt(QString const & CrAt)
{
    crat=CrAt;
}

void CWordTemplate::setUpdatedBy(QString const & UpdBy)
{
    updby=UpdBy;
}

void CWordTemplate::setUpdatedAt(QString const & UpdAt)
{
    updat=UpdAt;
}

void CWordTemplate::setNoQuality()
{
        quality.clear();
}
void CWordTemplate::setNoDerivCount()
{
        derivcount.clear();
}
void CWordTemplate::setWordKey(QString const & WordKey)
{
	wordkey=WordKey;
}
QString CWordTemplate::create(Mode mode,bool with_treelink)
{
    init(with_treelink);

    QString rv;
    switch(mode)
    {
            case ReadWord :
            {
                    rv=editword;
                    break;
            }
            case EditWord :
            {
                    rv=editword;
                    break;
            }
            case ReadDeriv :
            {
                    rv=editderiv;
                    break;
            }
            case EditDeriv :
            {
                    rv=editderiv;
                    break;
            }
            case Header :
            {
                rv=header;
                break;
            }
            case Html :
            {
                rv=c_html;
                break;
            }
    }
    rv.replace("(*key*)",key);
    rv.replace("(*type*)",type);
    rv.replace("(*crum*)",crum);
    rv.replace("(*quality*)",quality);
    rv.replace("(*word*)",word);
    rv.replace("(*czech*)",czech);
    rv.replace("(*english*)",english);
    rv.replace("(*greek*)",greek);
    rv.replace("(*wordkey*)",wordkey);
    rv.replace("(*table*)",table);
    rv.replace("(*dercount*)",derivcount);
    rv.replace("(*crby*)",crby);
    rv.replace("(*crat*)",crat);
    rv.replace("(*updby*)",updby);
    rv.replace("(*updat*)",updat);
    if(with_treelink)
        rv.replace("(*treelink*)",treelink);

    return rv;
}

QString CWordTemplate::formatw(QString const & str, bool brackets)
{
    QString r(str);

    if(brackets)
        r.replace(" (",QString("</li><li>("));

    QRegExp dre1("\\.\\..+\\.");
    dre1.setMinimal(true);
    int di=0,dl;
    while((di=dre1.indexIn(r,di))!=-1)
    {
        dl=dre1.matchedLength();
        if(dl!=-1)
        {
            r.insert(di,'[');
            r.insert(di+dl+1,']');
            r.replace(di+dl,1,'@');
            r.remove(di+1,2);
        }
    }

    di=-2;
    while((di=r.indexOf('.',di+2))!=-1)
    {
        r.insert(di-1,'[');
        r.insert(di+2,']');
    }
    //r.replace('@','.');
    r.remove('@');
    r.remove('.');

    //r.replace("+",QString(0x2720));
    //r.replace("*"+QString(0x2720),"+");
    r.replace("*+","+");
    r.replace("..",QString());
    r.replace("*^",QString(0x27E8));
    r.replace("^*",QString(0x27E9));
    r.replace("$^","(");
    r.replace("^$",")");
    r.replace("***$","<i>noun male/female: </i>");
    r.replace("$**","<i>neg </i>");
    r.replace("$*","<i>(nn)</i>");
    r.replace("**$","<i>noun female: </i>");
    r.replace("*$","<i>noun male: </i>");
    r.replace("*****","<i>noun: </i>");
    r.replace("****","<i>female: </i>");
    r.replace("***","<i>male: </i>");
    r.replace("**","<i>imperative: </i>");
    r.replace("*","<i>plural: </i>");
    r.replace("$$","<i>(?)</i>");
    r.replace("$","<i> &c</i>");
    r.replace("^^^","<i><b>c</b></i>");
    r.replace("^^",QString(0x2015));
    r.replace("^","<i>p c </i>");

    if(brackets)
    {
        r.prepend("<ul style=\"list-style-type: disc;\"><li>").append("</ul>");
        r.replace(",",", ");
    }
    return r;
}

void CWordTemplate::changeWord(QString const & newword)
{
    word=newword;
}

void CWordTemplate::changeEn(QString const & newword)
{
    english=newword;
}

void CWordTemplate::changeCz(QString const & newword)
{
    czech=newword;
}
