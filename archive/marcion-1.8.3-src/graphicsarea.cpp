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

#include "graphicsarea.h"

CGraphicsArea::CGraphicsArea(QWidget * parent)
    :QGraphicsView(parent),
    _m_pressed(false),
    started_pos(),
    _scene(new QGraphicsScene())
{
    setScene(_scene);
    viewport()->setCursor(Qt::OpenHandCursor);
}

CGraphicsArea::~CGraphicsArea()
{
    if(_scene)
        delete _scene;
}

void CGraphicsArea::mouseMoveEvent ( QMouseEvent * event )
{
    if(_m_pressed)
    {
        qreal xdiff=started_pos.x()-event->posF().x();
        qreal ydiff=started_pos.y()-event->posF().toPoint().y();
        centerOn(QPointF(center_pos.x()+xdiff,center_pos.y()+ydiff));
    }
}

void CGraphicsArea::mousePressEvent ( QMouseEvent * event )
{
    viewport()->setCursor(Qt::ClosedHandCursor);
    started_pos=event->pos();
    QRectF r(mapToScene(QPoint(0,0)),viewport()->size());
    center_pos=r.center();

    _m_pressed=true;

    //messages->MsgMsg(QString::number(mapToScene(event->pos()).x())+", "+QString::number(mapToScene(event->pos()).y()));
}

void CGraphicsArea::mouseReleaseEvent ( QMouseEvent *  )
{
    viewport()->setCursor(Qt::OpenHandCursor);
    _m_pressed=false;
}
