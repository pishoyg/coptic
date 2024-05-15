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

#ifndef CTRANSLIT_H
#define CTRANSLIT_H
//
#include <QString>
#include <QStringList>
#include <QRegExp>
#include <QPair>
#include <QDir>

//
//#define COUNT_WORDTYPE 23
#define COUNT_QUALITY 9

#define CRUM_FIRST 22
#define CRUM_LAST 865
#define CRUM_COUNT 843

class MTextLineItem{
public:
    MTextLineItem(QString const & rawdata,bool display);
    MTextLineItem(MTextLineItem const & other);
    ~MTextLineItem(){}
    void operator=(MTextLineItem const & other);
    QString note(bool tag=false) const,text() const,verse() const,
        indexW() const;
    bool hasNote() const {return _has_note;}
    bool hasIndexW() const {return _has_index_w;}
    void setText(QString const & text),setVerse(QString const & verse);
private:
    QString pushIndexItem(bool display, QString const & text);
    QString const _rawdata;
    QString _text,_note,_verse,_index_w;
    bool _has_note,_has_index_w;
};

typedef QPair<QString,int> QCWordClassItem;
typedef QList<QCWordClassItem> QCWordClass;

struct beta
{
    char beta[4];
    int utf;
};

struct cmbstruct{
        QString t;
	char n;
};

QString get_quality(int n);
cmbstruct & get_quality_item(int n);

class CTranslit
{

public:
	enum Script{
                Latin=1,Greek=2,Copt=3,Hebrew=4
};
        enum Tr{GreekNToGreekTr,
                GreekTrToGreekN,
                GreekNToGreekTr_num,
                GreekTrToGreekN_num,
                GreekTrToGreekNcs,
                CopticNToCopticTr,
                CopticTrToCopticN,
                CopticNToCopticTr_num,
                CopticTrToCopticN_num,
                HebrewNToHebrewTr,
                HebrewTrToHebrewN,
                HebrewNToHebrewTr_num,
                HebrewTrToHebrewN_num,
                LatinNToLatinTr,
                LatinTrToLatinN,
                CopticNToGreekTr,
                CopticNToGreekN,
                CopticDictC,
                CopticDictGr};

        enum SpaceMode {RemoveNone,RemoveAll,Trim,TrimAndKeepOne};

        static void init();

        static QString humRead(qint64 value);

        static QString tr(QString const & str,Tr from_to,bool strip=false,SpaceMode space_mode=RemoveNone);
	static QString to(QString latin,Script scr,
		bool ancient_only=false);
	static QString NAtoLatin(QString const &);
        static QString NAtoLatin2(QString const &,bool);
        static QString betaToUtfSimple(QString const & string,
                                 Script script);
        static QString betaToUtf(QString const & string,
                                 Script script);
        static QString betaToLatStripped(QString const & string,Script lang);
        static QString greekToLatinExt(QString const & str);
        static QString latinToGreekExt(QString const & str);
        static QString latinToCopticExt(QString const & str);
        static QString latinToXExt(QString const & str,Script script);

        static QString perseusToUtf8(QString const & latin);
        //static QString copticForLsj(QString const & coptic);
        static QString escaped(QString const & string);
        static QString normSep(QString const & path);
        static bool isCoptic(QString const & str);
        static bool isGreek(QString const & str);
        static bool isHebrew(QString const & str);
        static CTranslit::Script identify(QString const &);

        static QString getWordType(int n);
        //static bool isTag(QString const &,int);
        //static QString highlightHtmlText(QString const & str,QString const & in_text,QString const & fcolor,QString const & bcolor,bool regexp,bool words);
        static QString highlightCopDictWord(QString const & word,QString const & pattern,QString const & fcolor,QString const & bcolor);
        static QCWordClass CWClass;
private:
        static QString const lat,lat_heb,hebr,copt,copt2,gr,beta_wp_coptic,beta_wp_greek,lat_wp,lat_wpg,copt_wp;
        static QString const tr_clc,tr_llc,tr_clc_n,tr_llc_n,tr_ccl,tr_lcl,tr_ccl_n,tr_lcl_n,tr_glg,tr_glg_n,tr_ggl,tr_lgl,tr_ggl_n,tr_lgl_n,tr_llg,tr_llg_n,tr_hlh,tr_hlh_n,tr_hhl,tr_hhl_n,tr_llh,tr_llh_n,tr_lhl,tr_lhl_n,tr_lLl,tr_llL,tr_LLl,tr_LlL,tr_ccg,tr_gcg,tr_gcl,tr_glg_cs,tr_llg_cs;

};

struct beta * beta_p(CTranslit::Script script,beta ** beta_ns);

#endif
