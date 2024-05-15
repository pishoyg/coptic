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

#ifndef MDOCHEADER_H
#define MDOCHEADER_H

#include <QWidget>
#include <QButtonGroup>
#include <QStackedWidget>

namespace Ui {
class MDocHeader;
}

class MDocHeader : public QWidget
{
    Q_OBJECT

public:
    enum DocMode{Text,GkDict,CopDict,HebDict,CopGram,NumConv};
    explicit MDocHeader(QWidget *parent = 0);
    ~MDocHeader();

    void initFirstButton(QIcon const & icon, QString const & text);
    void setStWdg(QStackedWidget * widget);
    DocMode docMode() const {return _mode;}
    void setDocMode(DocMode mode=Text);
    void initPage(DocMode mode,int index);
    QStackedWidget * stWdg();
private:
    Ui::MDocHeader *ui;

    QButtonGroup _bgr;
    QStackedWidget * _stw;
    DocMode _mode;
    int gk_index,cop_index,cop_g_index,numcnv_index,heb_index;

    void checkToolsCount();
private slots:
    void slot_bgr_clicked(int index);
    void on_btDeleteCurrent_clicked();
};

#endif // MDOCHEADER_H
