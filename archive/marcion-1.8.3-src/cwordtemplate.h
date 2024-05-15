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

#ifndef CWORDTEMPLATE_H
#define CWORDTEMPLATE_H
//
#include <QString>
#include <QFile>
#include <QTextStream>
#include "ctranslit.h"
//
class CWordTemplate
{
//Q_OBJECT
public:
        CWordTemplate(bool,bool,
                      QString ,
                      QString ,
                      QString );
        CWordTemplate(CWordTemplate const &);
        CWordTemplate(){}

        CWordTemplate & operator=(CWordTemplate const &);
	enum Mode{
                ReadWord,EditWord,ReadDeriv,EditDeriv,Header,Html
	};

	void setKey(int),
                setKey(QString const &),
		setType(short int),
                setCrum(QString const & Crum,
                    QString const & TreeLink),
		setQuality(short int),
                setWord(QString const &),
                setCzech(QString const &),
                setEnglish(QString const &),
                setGreek(QString const &),
                setTable(QString const &),
                setWordKey(QString const &),
                setDerivCount(QString const &),
                setCreatedBy(QString const &),
                setCreatedAt(QString const &),
                setUpdatedBy(QString const &),
                setUpdatedAt(QString const &),
                setNoDerivCount(),
		setNoQuality();

        void changeWord(QString const &);
        void changeEn(QString const &);
        void changeCz(QString const &);

        QString wordTr() const {return word;}
        QString czTr() const {return czech;}
        QString enTr() const {return english;}

        QString create(Mode mode,bool with_treelink);
        static QString formatw(QString const &, bool brackets=true);
private:
        void init(bool with_treelink);
        QString header,editderiv,editword;
        bool coptic_edit, show_czech;
        QString border, padding, spacing;
        static QString const c_header,c_editderiv,c_editword,c_html;
	QString key,type,crum,quality,
                word,czech,english,greek,wordkey,table,derivcount,crby,crat,updby,updat,treelink;
};
#endif
