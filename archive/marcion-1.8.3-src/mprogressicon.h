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

#ifndef MPROGRESSICON_H
#define MPROGRESSICON_H

#include <QLabel>
#include <QPixmap>
#include <QPaintEvent>
#include <QPainter>
#include <QBitmap>
#include <QTimer>
#include <QApplication>

class MProgressIcon : public QLabel
{
    Q_OBJECT
public:
    enum PixmapType{Picture,Main,Part};
    explicit MProgressIcon(QWidget *parent = 0);
    ~MProgressIcon();

    void setPixmap(QPixmap const & pixmap,PixmapType texture,int scale_to=-1);
    void setMaximum(int maximum);
    void setValue(int value);
    void incValue(int step=1);
    void setColor(QColor color)
        {_color=color;}
    void setBorderColor(QColor border_color)
        {_border_color=border_color;}
    void setColorPart(QColor color)
        {_colorp=color;}
    void setBorderColorPart(QColor border_color)
        {_border_colorp=border_color;}
    QColor color() const {return _color;}
    QColor borderColor() const {return _border_color;}
    int value() const {return _value;}
    int maximum() const {return _max;}
    void applyMask();

    void setMaximumPart(int maximum);
    void setValuePart(int value);
    void incValuePart(int step=1);
    void clearPart();

    void setPenPart(int width){_pen_w=width;}
    void useTimer(int msec),stopTimer();
    void processEvents(bool events);
    void autoShow(){_auto_show=true;}
    void alwaysRepaintMain(bool repaint)
        {_always_repaint_main=repaint;}
    void setSilent(bool silent){_silent=silent;}
protected:
    void paintEvent(QPaintEvent * event);
private:
    QPixmap _pixmap,_texture,_texture_part;
    int _max,_value,_maxp,_valuep;
    double _piece,_piecep,_piecep2;
    int _pen_w;
    QPoint _center;
    QSize _size;
    QColor _color,_border_color,_colorp,_border_colorp;
    static double golden_ratio;
    QTimer _timer;
    int _last_value,_last_valuep;
    bool _use_timer,_events,_auto_show,_always_repaint_main,_silent;

    void drawProgress(QPainter & painter);
    void drawProgressPart(QPainter & painter);
private slots:
    void slot_repaintOnTimeout();
};

#endif // MPROGRESSICON_H
