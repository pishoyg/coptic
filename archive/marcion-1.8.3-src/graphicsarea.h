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

#ifndef GRAPHICSAREA_H
#define GRAPHICSAREA_H

#include <QGraphicsView>
#include <QMouseEvent>

//#include "messages.h"

class CGraphicsArea : public QGraphicsView
{
public:
    CGraphicsArea(QWidget * parent = 0);
    ~CGraphicsArea();

    //QGraphicsScene * scene() {return _scene;}

    //CMessages * messages;
protected:
    virtual void mouseMoveEvent ( QMouseEvent * event );
    virtual void mousePressEvent ( QMouseEvent * event );
    virtual void mouseReleaseEvent ( QMouseEvent * event );


private:
    bool _m_pressed;
    QPointF started_pos;
    QPointF center_pos;
    QGraphicsScene * _scene;


};

#endif // GRAPHICSAREA_H
