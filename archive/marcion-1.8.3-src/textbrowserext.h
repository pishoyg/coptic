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

#ifndef TEXTBROWSEREXT_H
#define TEXTBROWSEREXT_H

#include "booktextbrowser.h"
#include "wordpreview.h"
#include "lsj.h"
#include "mcopticnumerals.h"
#include "mdocheader.h"
#include "mhebrdict.h"

class CTranslBook;
class CTextBrowserExt : public CBookTextBrowser
{
    Q_OBJECT
    Q_DISABLE_COPY(CTextBrowserExt)
public:
    CTextBrowserExt(QWidget *parent = 0);
    ~CTextBrowserExt();
    void init(QString const & title,
              Script script,bool change_font=true);
    MDocHeader * header();
protected:
    friend class MVersedBook;

    void find_word(QString const & word);
    void find_greek_word(QString const & word);
    void find_hebrew_word(QString const & word);
    void convert_number(QString const & number);

private:
    friend class CTranslBook;

    CWordPreview * copDict();
    CLSJ * gkDict();
    MCopticNumerals * copNum();
    MHebrDict * hebDict();

    CWordPreview * preview;
    CLSJ * lsj_preview;
    MCopticNumerals * copnum_preview;
    MHebrDict * heb_preview;
};

#endif // TEXTBROWSEREXT_H
