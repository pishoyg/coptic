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

#ifndef REGEXPBUILDER_H
#define REGEXPBUILDER_H

#include <QWidget>
#include <QComboBox>

#include "settings.h"

namespace Ui {
    class MRegExpBuilder;
}

class MRegExpBuilder : public QWidget
{
    Q_OBJECT

public:
    explicit MRegExpBuilder(QString const & text,QComboBox * const target,bool const inmenu,QWidget *parent = 0);
    ~MRegExpBuilder();

    QString outputText() const;
private:
    Ui::MRegExpBuilder *ui;

    QComboBox * const target;
    bool const inmenu;
private slots:
    void on_txtReg_returnPressed();
    void on_btGrpN_clicked();
    void on_btEsc_clicked();
    void on_btTest_clicked();
    void on_btUpdate_clicked();
    void on_btEnd_clicked();
    void on_btBeg_clicked();
    void on_btOcc2_clicked();
    void on_btOcc1_clicked();
    void on_btSeq3_clicked();
    void on_btSeq2_clicked();
    void on_btSeq1_clicked();
    void on_btZ1_clicked();
    void on_bt1M_clicked();
    void on_btZM_clicked();
    void on_btGrp_clicked();
    void on_btChar_clicked();
    void on_btClose_clicked();
};

#endif // REGEXPBUILDER_H
