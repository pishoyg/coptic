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

#ifndef MIMAGEWIDGET_H
#define MIMAGEWIDGET_H

#include <QWidget>
#include <QButtonGroup>
#include <QScrollBar>

#include "mimage.h"
#include "mnavwnd.h"

namespace Ui {
    class MImageWidget;
}

class MImageWidget : public QWidget
{
    Q_OBJECT
#ifndef NO_POPPLER
    friend class MPdfReader2;
#endif
public:
    enum ImgMode{Img,Map};
    explicit MImageWidget(QWidget *parent = 0);
    ~MImageWidget();

    CMImage * drawarea();
    ImgMode mode() const {return _mode;}
    void setMode(ImgMode mode);
    void closeNavigator();
protected:
    void keyPressEvent(QKeyEvent * e);
    void hideEvent(QHideEvent * event);
private:
    Ui::MImageWidget *ui;
    QButtonGroup bgr;
    ImgMode _mode;
    double _longitude,_latitude;
    bool _valid_long,_valid_lat;
    MNavWnd * _w;
private slots:
    void on_gwArea_positionChanged(QPointF);
    void on_btImageAction_clicked(bool checked);
    void on_btMove_clicked(bool checked);
    void on_btSelect_clicked(bool checked);

    void on_gwArea_mouseModeChanged(int);
    void on_gwArea_settingsActivated(bool);
    void on_btSett_clicked(bool checked);
    void on_spnBorder_valueChanged(int );
    void on_spnOpacity_valueChanged(int );
    void on_ccPen_bgColorSelected(QColor);
    void on_ccFill_bgColorSelected(QColor);
    void on_tbGrid_clicked(bool checked);
    void on_tbNavigate_clicked();

    void slot_navigate(double x_percent,double y_percent);
};

#endif // MIMAGEWIDGET_H
