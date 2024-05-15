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

#include "msrwidget.h"

MSRWidget::MSRWidget(QWidget *parent) :
    QTabWidget(parent),
    _bpct()
{
}

//

bool MSRWidget::loadBackground(QString const & filename)
{
    bool loaded=_bpct.load(filename);
    if(!loaded)
        _bpct=QPixmap();
    return loaded;
}

void MSRWidget::paintEvent(QPaintEvent * event)
{
    if(count()>0)
        QTabWidget::paintEvent(event);
    else
    {
        if(_bpct.isNull())
            QTabWidget::paintEvent(event);
        else
        {
            QRect const rw(event->rect());
            int const pw=_bpct.width(),
                    ph=_bpct.height();
            QPainter painter(this);
            painter.setClipRegion(event->region());
            int h=0;
            while(h<rw.height())
            {
                int w=0;
                while(w<rw.width())
                {
                    painter.drawPixmap(QPoint(w,h),_bpct);
                    w+=pw;
                }
                h+=ph;
            }
            painter.end();
            event->accept();
        }
    }
}
