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

#ifndef MARCKEYB_H
#define MARCKEYB_H

#include <QWidget>
#include <QComboBox>
#include <QPushButton>

#include "ctranslit.h"
#include "settings.h"

namespace Ui {
    class CMarcKeyb;
}

class CMarcKeyb : public QWidget {
    Q_OBJECT
public:
    enum Script
    {
        Coptic=CTranslit::Copt,
        Greek=CTranslit::Greek,
        Hebrew=CTranslit::Hebrew,
        Latin=CTranslit::Latin
    };

    CMarcKeyb(Script,QFont,QString const &,QComboBox * const,bool inmenu,bool numeric=false,QWidget *parent = 0);
    ~CMarcKeyb();

    QString outputText() const;
protected:
    void changeEvent(QEvent *e);
private:
    Ui::CMarcKeyb *ui;

    Script _script;
    QFont _font;
    QComboBox * const target;
    bool const inmenu,_numeric;

    void createKeyboard();
private slots:
    void on_txtText_returnPressed();
    void on_btOk_clicked();

    void slot_letterEmitted();
    void on_btClose_clicked();
};

#endif // MARCKEYB_H
