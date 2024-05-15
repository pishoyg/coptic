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

#include "mprogressicon.h"

double MProgressIcon::golden_ratio(1.61803399);

MProgressIcon::MProgressIcon(QWidget *parent) :
    QLabel(parent),
    _pixmap(),_texture(),_texture_part(),
    _max(0),_value(0),
    _maxp(0),_valuep(0),
    _piece(0),_piecep(0),_piecep2(0),
    _pen_w(-1),
    _center(),
    _size(),
    _color(212,175,55,255/3),
    _border_color(Qt::black),
    _colorp(212,175,55,255/3),
    _border_colorp(Qt::black),
    _timer(),
    _last_value(0),_last_valuep(0),
    _use_timer(false),_events(false),
    _auto_show(false),
    _always_repaint_main(false),
    _silent(false)
{
    setMargin(0);
    setSizePolicy(QSizePolicy::Fixed,QSizePolicy::Fixed);

    connect(&_timer,SIGNAL(timeout()),this,SLOT(slot_repaintOnTimeout()));
}

MProgressIcon::~MProgressIcon()
{
}

void MProgressIcon::setPixmap(QPixmap const & pixmap,PixmapType texture,int scale_to)
{
    QPixmap * ppix(&_pixmap);
    switch(texture)
    {
    case Picture :
        //ppix=&_pixmap;
        break;
    case Main :
        ppix=&_texture;
        break;
    case Part :
        ppix=&_texture_part;
        break;
    }

    if(scale_to>0)
        (*ppix)=pixmap.scaledToHeight(scale_to);
    else
        (*ppix)=pixmap;

    if(texture==Picture)
    {
        _size=QSize(ppix->height(),ppix->height());
        setMinimumSize(ppix->size());
        setMaximumSize(ppix->size());
        _center=QRect(QPoint(0,0),_size).center();
    }
}

void MProgressIcon::paintEvent(QPaintEvent * event)
{
    QPainter painter(this);
    painter.setClipRect(event->rect(),Qt::ReplaceClip);
    //painter.setClipRegion(event->region(),Qt::ReplaceClip);
    painter.drawPixmap(QPoint(0,0),_pixmap);
    if(_max>0&&_value<=_max)
        drawProgress(painter);
    if(_maxp>0&&_valuep<=_maxp)
        drawProgressPart(painter);
    event->accept();
}

void MProgressIcon::setValue(int value)
{
    if(!_silent)
    {
        _value=value>_max?_max:value;
        clearPart();
        /*if(_auto_show)
        {
            if(parentWidget())
                parentWidget()->show();
        }*/
        if(!_use_timer||_always_repaint_main)
            repaint();
        if(_events)
            QApplication::processEvents();
    }
}

void MProgressIcon::incValue(int step)
{
    setValue(_value+step);
}

void MProgressIcon::setMaximum(int maximum)
{
    _max=maximum;
    //_value=0;
    _piece=(double)(-360*16)/_max;
}

void MProgressIcon::setMaximumPart(int maximum)
{
    _maxp=maximum;
    _piecep2=(double)(-360*16)/_maxp;
    _piecep=_piece/_maxp;
}

void MProgressIcon::setValuePart(int value)
{
    if(!_silent)
    {
        _valuep=value>_maxp?_maxp:value;
        if(!_use_timer)
            repaint();
        if(_events)
            QApplication::processEvents();
    }
}

void MProgressIcon::incValuePart(int step)
{
    setValuePart(_valuep+step);
}

void MProgressIcon::clearPart()
{
    _maxp=_valuep=0;
    _piecep=_piecep2=0;
}

void MProgressIcon::drawProgress(QPainter & painter)
{
    if(!_silent)
        if(_value>=0||_valuep>=0)
        {
            QBrush brush(_color,Qt::SolidPattern);
            QPen pen(_border_color);
            pen.setWidth(2);
            painter.save();
            if(!_texture.isNull())
                brush.setTexture(_texture);
            painter.setBrush(brush);
            painter.setPen(pen);
            QRect const r(QPoint(0,0),QSize(_size.width()-2,_size.height()-2));
            if(_value<_max)
                painter.drawPie(r,90*16,(int)(_piece*_value)+(_piecep*_valuep));
            else
                painter.drawEllipse(r);
            painter.restore();
            _last_value=_value;
        }
}

void MProgressIcon::drawProgressPart(QPainter & painter)
{
    if(!_silent)
        if(_valuep>=0)
        {
            QBrush brush(Qt::NoBrush);
            QPen pen(_border_colorp);
            if(_pen_w>0)
                pen.setWidthF((double)_size.width()/_pen_w);
            else
                pen.setWidth(2);
            painter.save();
            if(!_texture_part.isNull())
            {
                brush.setTexture(_texture_part);
                painter.setPen(pen);
                painter.setBrush(brush);

                QRect const r(QPoint(0,0),QSize(_size.width()-2,_size.height()-2));
                if(_valuep<_maxp)
                    painter.drawPie(r,90*16,(int)(_piecep2*_valuep));
                else
                    painter.drawEllipse(r);
            }
            else
            {
                painter.setPen(pen);
                painter.setBrush(brush);
                QSize const _s(_size.width()/1.27,_size.height()/1.27);
                QRect const r(
                            QPoint(_center.x()-(_s.width()/2),_center.y()-(_s.height()/2)),
                            QSize(_s.width()-2,_s.height()-2));
                if(_valuep<_maxp)
                    painter.drawArc(r,90*16,(int)(_piecep2*_valuep));
                else
                    painter.drawEllipse(r);
            }
            painter.restore();
            _last_valuep=_valuep;
        }
}

void MProgressIcon::applyMask()
{
    setMask(_pixmap.mask());
}

/*void MProgressIcon::applyMaskOnTopLevelWidget()
{
    QWidget * _w=topLevelWidget();
    if(_w)
    {
        QSize const _tlws(_w->frameSize());
        QPoint _p(mapFrom(_w,QPoint(0,0)));
        QRegion reg(_pixmap.mask());
        //int _x(x()),_y(y());
        reg.translate(_p.x(),_p.y());
        _w->setMask(reg);
    }
}*/

void MProgressIcon::useTimer(int msec)
{
    if(!_silent)
    {
        _use_timer=true;
        _timer.start(msec);
    }
}

void MProgressIcon::slot_repaintOnTimeout()
{
    if(!_silent)
        if(!(_value==_last_value&&_valuep==_last_valuep))
        {
            repaint();
            if(_events)
                QApplication::processEvents();
        }

    if(_value>=_max)
        _timer.stop();
}

void MProgressIcon::stopTimer()
{
    _use_timer=false;
    _timer.stop();
}

void MProgressIcon::processEvents(bool events)
{
    _events=events;
}
