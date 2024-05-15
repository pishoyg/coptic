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

#ifndef TRANSLBOOK_H
#define TRANSLBOOK_H

#include <QUrl>

#include "htmlreader.h"
#include "grammar.h"

class CTranslBook : public CHtmlReader
{
    Q_OBJECT
    Q_DISABLE_COPY(CTranslBook)
public:
    CTranslBook(QString const & filename,
                CBookTextBrowser::Script script=CBookTextBrowser::Latin,
                QString const & show_text=QString(),
               QWidget * parent = 0);
    ~CTranslBook();
private slots:
    void slot_anchorClicked(QUrl);
private:
    CGrammar * gramm;
};

#endif // TRANSLBOOK_H
