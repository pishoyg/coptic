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

#include "mcmbboxresult.h"

MCmbBoxResult::MCmbBoxResult(QWidget * parent) :
    QComboBox(parent)
{
}

void MCmbBoxResult::paintEvent(QPaintEvent * e)
{
    QString const t(currentText());
    QPainter painter(this);
    painter.setClipRect(e->rect());
    QRect r(QPoint(0,0),size()),r2(r);
    QBrush const brush(Qt::white,Qt::SolidPattern);
    painter.fillRect(r2,brush);
    r2.setTop(r2.top()+1);
    r2.setLeft(r2.left()+1);
    r2.setWidth(r2.width()-1);
    r2.setHeight(r2.height()-1);
    painter.setFont(font());
    QPen pen((QColor(Qt::gray)));
    pen.setWidth(1);
    painter.setPen(pen);
    painter.drawRect(r2);
    if(!t.isEmpty())
    {
        pen.setColor(QColor(Qt::black));
        painter.setPen(pen);
        QRect r2(r);
        r2.setLeft(r2.left()+5);
        r2.setWidth(r2.width()-r2.height());
        ((RtfTextDelegate*)itemDelegate())->drawText(&painter,t,r2,m_sett()->HTCDNorm(),Qt::AlignLeft|Qt::AlignVCenter|Qt::TextSingleLine);
        //painter.drawText(r2,Qt::AlignLeft|Qt::AlignVCenter|Qt::TextSingleLine,t);

        int const h(r.height()/2),h3(r.height()),h2(h3/5),h4(h3/4);
        QPoint const p(r.right()-r.height(),0);
        pen.setWidth(0);
        pen.setColor(QColor(Qt::gray));
        QBrush const decor_brush(Qt::gray,Qt::SolidPattern);
        painter.setBrush(decor_brush);
        painter.setPen(pen);
        QPoint points[4]={
            QPoint(p.x()+h4,p.y()+h),
            QPoint(p.x()+h,p.y()+h4),
            QPoint(p.x()+h3-h4,p.y()+h),
            QPoint(p.x()+h,p.y()+h3-h4)
        };
        painter.drawConvexPolygon(points,4);
        QRect const patch(QPoint(p.x(),(h2*2)+1),QSize(h3,h2));
        painter.fillRect(patch,brush);
    }

    e->accept();
}
