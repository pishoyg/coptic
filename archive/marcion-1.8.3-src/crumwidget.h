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

#ifndef CRUMWIDGET_H
#define CRUMWIDGET_H

#include "djvuwidget.h"
#include "messages.h"
#include "settings.h"

#include <QDir>

#ifndef NO_DJVIEW
    #include "qdjview.h"
#else
    #include "no_djview/crumview.h"
#endif

namespace Ui {
class CCrumWidget;
}

class CCrumWidget : public QWidget{
    Q_OBJECT
public:
    CCrumWidget(CMessages const * messages, QWidget *parent = 0);
    ~CCrumWidget();

    void showPage(int);
    //QComboBox ** pages(){return &cmbPages;}
private slots:
    void on_cmbPages_currentIndexChanged(int index);
    void on_cmbLetter_editTextChanged(QString );
    void on_cmbStretch_currentIndexChanged(int index);
    void on_cmbLetter_currentIndexChanged(int index);
    void on_btMoveNext_pressed();
    void on_btMovePrev_pressed();

private:
    Ui::CCrumWidget * ui;
    CMessages const * messages;
#ifndef NO_DJVIEW
        QDjVuContext context;
        CDjVuWidget djView;
#else
        CCrumView crumview;
#endif
        void InitCrum();
};

#endif // CRUMWIDGET_H
